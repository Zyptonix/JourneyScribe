'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import NavigationBar from '@/components/NavigationBar'; // Assuming light theme is default

// --- NEW Notification Preference Definitions ---
// These keys directly correspond to the checks you'll perform in your backend.
const PREFERENCE_DEFINITIONS = [
    {
        category: 'Bookings',
        settings: [
            { key: 'flight_booking_email', title: 'Flight Booking Emails', description: 'Receive booking confirmations and updates via email.' },
            { key: 'flight_booking_inapp', title: 'Flight Booking In-App', description: 'Get in-app notifications for your flight bookings.' },
            { key: 'hotel_booking_email', title: 'Hotel Booking Emails', description: 'Receive hotel booking receipts and details via email.' },
            { key: 'hotel_booking_inapp', title: 'Hotel Booking In-App', description: 'Get in-app notifications for your hotel reservations.' }
        ]
    },
    {
        category: 'Your Activities',
        settings: [
            { key: 'new_trip_request', title: 'New Trip Join Requests', description: 'Get notified when a user requests to join one of your trips.' },
            { key: 'new_blog_comment', title: 'New Comments on Your Blogs', description: 'Be notified when someone comments on a blog you created.' },
            { key: 'new_chat_message', title: 'New Chat Messages', description: 'Receive a notification for new unread chat messages.' }
        ]
    }
];

// --- Helper Components ---
const Spinner = ({ className = 'h-5 w-5' }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const Message = ({ message }) => {
    if (!message.text) return null;
    const colors = {
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-gray-100 text-gray-800',
    };
    return <p className={`text-center p-3 rounded-md text-sm font-medium ${colors[message.type]}`}>{message.text}</p>;
};


// --- Main Settings Page Component ---
const NotificationSettingsPage = () => {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState(null);
    const [preferences, setPreferences] = useState({});
    const [initialPreferences, setInitialPreferences] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(initialPreferences);
    const API_BASE_URL = '/api/notifications';

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!user) throw new Error("User is not authenticated.");
        const token = await user.getIdToken();
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        return response.json();
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setError("You must be logged in to manage your notification settings.");
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isAuthReady && user) {
            const fetchPreferences = async () => {
                setIsLoading(true);
                setMessage({ text: '', type: '' });
                try {
                    const savedPreferences = await authenticatedFetch(`${API_BASE_URL}/preferences`);
                    const allKeys = PREFERENCE_DEFINITIONS.flatMap(cat => cat.settings.map(s => s.key));
                    const initialSettings = {};
                    allKeys.forEach(key => {
                        initialSettings[key] = savedPreferences[key] !== undefined ? savedPreferences[key] : true;
                    });
                    setPreferences(initialSettings);
                    setInitialPreferences(initialSettings);
                } catch (err) {
                    setMessage({ text: `Failed to load settings: ${err.message}`, type: 'error' });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPreferences();
        }
    }, [isAuthReady, user, authenticatedFetch]);

    const handleTogglePreference = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setMessage({ text: 'Saving...', type: 'info' });
        try {
            await authenticatedFetch(`${API_BASE_URL}/preferences`, {
                method: 'POST',
                body: JSON.stringify(preferences),
            });
            setMessage({ text: 'Your preferences have been saved successfully!', type: 'success' });
            setInitialPreferences(preferences);
        } catch (err) {
            setMessage({ text: `Failed to save preferences: ${err.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAuthReady) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50"><Spinner className="h-8 w-8 text-gray-500" /></div>;
    }

    if (error) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="p-4 text-red-800 bg-red-100 rounded-lg">{error}</div></div>;
    }

    return (
        <div className="min-h-screen font-sans bg-gray-50 text-gray-900">
            <NavigationBar />
            <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h1 className="text-2xl font-bold">Notification Settings</h1>
                        <p className="mt-1 text-sm text-gray-600">Manage how you receive notifications from us.</p>
                    </div>

                    {isLoading ? (
                        <div className="p-6 text-center text-gray-500">Loading your settings...</div>
                    ) : (
                        PREFERENCE_DEFINITIONS.map(category => (
                            <div key={category.category}>
                                <h2 className="px-6 pt-6 text-lg font-semibold text-gray-800">{category.category}</h2>
                                <div className="divide-y divide-gray-200">
                                    {category.settings.map(pref => (
                                        <div key={pref.key} className="p-6 flex items-start justify-between">
                                            <div className="mr-4">
                                                <h3 className="font-semibold">{pref.title}</h3>
                                                <p className="text-sm text-gray-500">{pref.description}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences[pref.key] || false}
                                                    onChange={() => handleTogglePreference(pref.key)}
                                                    className="sr-only peer"
                                                    disabled={isSaving}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                    
                    <div className="p-6 bg-gray-50 rounded-b-lg flex flex-col items-end">
                        {message.text && <div className="w-full mb-4"><Message message={message} /></div>}
                        <button
                            onClick={handleSaveChanges}
                            disabled={!hasChanges || isSaving}
                            className="flex items-center justify-center px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Spinner className="h-5 w-5 text-white" /> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default NotificationSettingsPage;