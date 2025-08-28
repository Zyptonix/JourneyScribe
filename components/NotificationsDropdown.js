'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '@/lib/firebaseClient'; // Adjust path if needed
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

// --- Icons ---
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
const InboxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;

export default function NotificationsDropdown() {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const dropdownRef = useRef(null);

    // Listen for auth state changes to get the user object for token generation
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Authenticated fetch function
    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!user) throw new Error("User not authenticated.");
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

    // Fetch notifications when dropdown is opened
    useEffect(() => {
        if (user && isOpen) {
            const fetchNotifications = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    // Fetch latest 7 notifications
                    const data = await authenticatedFetch('/api/notifications/inapp?limit=7'); 
                    setNotifications(data.notifications || []);
                    const unread = (data.notifications || []).filter(n => !n.read).length;
                    setUnreadCount(unread);
                } catch (err) {
                    setError(`Failed to load notifications.`);
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchNotifications();
        }
    }, [user, isOpen, authenticatedFetch]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) {
        // Don't render the component if the user is not logged in
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative text-gray-700 hover:text-blue-600 focus:outline-none"
                aria-label="Toggle notifications"
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <InboxIcon /> Notifications
                        </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <p className="text-center p-4 text-gray-500">Loading...</p>
                        ) : error ? (
                            <p className="text-center p-4 text-red-600 bg-red-50">{error}</p>
                        ) : notifications.length > 0 ? (
                            notifications.map(notif => (
                                <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                                    <div className="flex items-start gap-3">
                                        <span className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${notif.read ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                                        <div className="w-full">
                                            <p className="font-semibold text-gray-700 capitalize">
                                                {notif.type?.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-sm text-gray-600">{notif.message}</p>
                                            <p className="text-xs text-gray-400 mt-1 text-right">
                                                {new Date(notif.timestamp._seconds * 1000).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center p-4 text-gray-500">Your notification feed is empty.</p>
                        )}
                    </div>
                    <div className="p-2 bg-gray-50 text-center rounded-b-lg">
                        <Link href="/notifications" className="text-sm font-semibold text-blue-600 hover:underline">
                            View All Notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}