'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';

// --- Icons ---
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
const InboxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;

// --- NEW: Helper function to format dates nicely ---
const formatRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NotificationsDropdown() {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const dropdownRef = useRef(null);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Authenticated fetch function for marking as read
    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!user) throw new Error("User not authenticated.");
        const token = await user.getIdToken();
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        await fetch(url, { ...options, headers });
    }, [user]);

    // Fetch notifications in real-time
    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const notificationsRef = collection(db, 'userProfiles', user.uid, 'inapp');
            const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(7));

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const fetchedNotifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNotifications(fetchedNotifications);

                const unread = fetchedNotifications.filter(n => !n.read).length;
                setUnreadCount(unread);
                
                setIsLoading(false);
            }, (err) => {
                setError('Failed to load notifications.');
                console.error(err);
                setIsLoading(false);
            });

            return () => unsubscribe();
        }
    }, [user]);

    // Mark notifications as read when dropdown is opened
    const markNotificationsAsRead = useCallback(async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0 || !user) return;

        // Optimistically update UI
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => n.read ? n : { ...n, read: true }));

        try {
            await authenticatedFetch('/api/notifications/inapp/mark-read', {
                method: 'POST',
                body: JSON.stringify({ ids: unreadIds }),
            });
        } catch (err) {
            console.error("Failed to mark notifications as read:", err);
            // Note: In a real app, you might want to revert the optimistic UI update on failure.
        }
    }, [user, notifications, authenticatedFetch]);

    useEffect(() => {
        if (isOpen) {
            markNotificationsAsRead();
        }
    }, [isOpen, markNotificationsAsRead]);

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

    if (!user) return null;

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
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <InboxIcon /> Notifications
                        </h3>
                        <Link href="/notifications" onClick={() => setIsOpen(false)} className="text-xs font-semibold text-blue-600 hover:underline">
                            Settings
                        </Link>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <p className="text-center p-4 text-gray-500">Loading...</p>
                        ) : error ? (
                            <p className="text-center p-4 text-red-600 bg-red-50">{error}</p>
                        ) : notifications.length > 0 ? (
                            notifications.map(notif => (
                                <NotificationItem key={notif.id} notification={notif} closeDropdown={() => setIsOpen(false)} />
                            ))
                        ) : (
                            <p className="text-center p-4 text-gray-500">Your notification feed is empty.</p>
                        )}
                    </div>
                    <div className="p-2 bg-gray-50 text-center rounded-b-lg">
                        <Link href="/notifications/all" onClick={() => setIsOpen(false)} className="text-sm font-semibold text-blue-600 hover:underline">
                            View All Notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- NEW: Sub-component for rendering each notification item ---
const NotificationItem = ({ notification, closeDropdown }) => {
    const content = (
        <div className="flex items-start gap-3">
            <span className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${notification.read ? 'bg-gray-400' : 'bg-blue-500'}`}></span>
            <div className="w-full">
                <p className="font-semibold text-gray-700 capitalize">
                    {notification.title}
                </p>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-1 text-right">
                    {/* MODIFIED: Use the new date formatting function */}
                    {notification.timestamp ? formatRelativeTime(notification.timestamp.toDate().toISOString()) : ''}
                </p>
            </div>
        </div>
    );

    // MODIFIED: Conditionally wrap with a Link if a link exists
    if (notification.link) {
        return (
            <Link href={notification.link} onClick={closeDropdown} className="block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                {content}
            </Link>
        );
    }

    return (
        <div className="p-4 border-b border-gray-100">
            {content}
        </div>
    );
};