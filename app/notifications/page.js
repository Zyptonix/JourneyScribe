'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient'; // Adjust path as needed
import NavigationBar from '@/components/NavigationBar';

// --- Default Notification Preferences ---
// This array defines the settings that will appear on the page.
// You can easily add or remove items here.
const PREFERENCE_DEFINITIONS = [
    {
        key: 'trip_updates',
        title: 'Trip Updates',
        description: 'Get notified about flight delays, gate changes, and cancellations.'
    },
    {
        key: 'event_reminders',
        title: 'Event Reminders',
        description: 'Receive reminders for upcoming bookings, check-in times, and events.'
    },
    {
        key: 'price_alerts',
        title: 'Price Alerts',
        description: 'Be notified when flight prices for routes you are watching change.'
    },
    {
        key: 'special_offers',
        title: 'Special Offers & Promotions',
        description: 'Get news about special promotions, travel deals, and new features.'
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
    // --- State Management ---
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState(null);

    // Preferences state
    const [preferences, setPreferences] = useState({});
    const [initialPreferences, setInitialPreferences] = useState({}); // To track changes
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(initialPreferences);

    // --- API and Auth ---
    const API_BASE_URL = '/api/notifications';

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!user) throw new Error("User is not authenticated.");
        const token = await user.getIdToken();
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        return response.json();
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                setError("You must be logged in to manage your notification settings.");
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        if (isAuthReady && user) {
            const fetchPreferences = async () => {
                setIsLoading(true);
                setMessage({ text: '', type: '' });
                try {
                    // This API endpoint should return the user's saved preferences object
                    const savedPreferences = await authenticatedFetch(`${API_BASE_URL}/preferences`);
                    
                    // Initialize preferences based on definitions, overwritten by saved data
                    const initialSettings = {};
                    PREFERENCE_DEFINITIONS.forEach(def => {
                        // Set to saved value, or true by default if not set
                        initialSettings[def.key] = savedPreferences[def.key] !== undefined ? savedPreferences[def.key] : true;
                    });

                    setPreferences(initialSettings);
                    setInitialPreferences(initialSettings); // Store the initial state
                } catch (err) {
                    setMessage({ text: `Failed to load settings: ${err.message}`, type: 'error' });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPreferences();
        }
    }, [isAuthReady, user, authenticatedFetch]);

    // --- Event Handlers ---
    const handleTogglePreference = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setMessage({ text: 'Saving...', type: 'info' });
        try {
            // This API endpoint should accept the entire preferences object and save it
            await authenticatedFetch(`${API_BASE_URL}/preferences/user`, {
                method: 'POST', // Or PUT
                body: JSON.stringify(preferences),
            });
            setMessage({ text: 'Your preferences have been saved successfully!', type: 'success' });
            setInitialPreferences(preferences); // Update the initial state to match the saved state
        } catch (err) {
            setMessage({ text: `Failed to save preferences: ${err.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render Logic ---
    if (!isAuthReady) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50"><Spinner className="h-8 w-8 text-gray-500" /></div>;
    }

    if (error) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="p-4 text-red-800 bg-red-100 rounded-lg">{error}</div></div>;
    }

    return (
        <div className="min-h-screen font-sans bg-gray-50 text-black">
            <NavigationBar />
            <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-gray-200 border border-gray-200 rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage how you receive notifications from us.</p>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {isLoading ? (
                            <div className="p-6 text-center text-gray-500">Loading your settings...</div>
                        ) : (
                            PREFERENCE_DEFINITIONS.map(pref => (
                                <div key={pref.key} className="p-6 flex items-center justify-between">
                                    <div>
                                        <h2 className="font-semibold text-gray-800">{pref.title}</h2>
                                        <p className="text-sm text-gray-500">{pref.description}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences[pref.key] || false}
                                            onChange={() => handleTogglePreference(pref.key)}
                                            className="sr-only peer"
                                            disabled={isSaving}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                                    </label>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 bg-gray-200 rounded-b-lg flex flex-col items-end">
                        {message.text && <div className="w-full mb-4"><Message message={message} /></div>}
                        <button
                            onClick={handleSaveChanges}
                            disabled={!hasChanges || isSaving}
                            className="flex items-center justify-center px-5 py-2.5 bg-black text-white font-semibold rounded-lg shadow-sm transition-colors duration-200 hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed"
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
