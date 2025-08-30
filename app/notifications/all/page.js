'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBar from '@/components/NavigationBar'; // Use your default Nav Bar
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- ICONS ---
const InboxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>;


// --- Main Page Logic Component ---
function AllNotifications() {
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [lastDocId, setLastDocId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const router = useRouter();

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!user) throw new Error("User not authenticated.");
        const token = await user.getIdToken();
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        return response.json();
    }, [user]);

    const fetchNotifications = useCallback(async (lastId = null) => {
        if (!user || !hasMore && lastId) return;
        
        lastId ? setLoadingMore(true) : setLoading(true);
        setError('');

        try {
            let url = '/api/notifications/inapp?limit=15';
            if (lastId) {
                url += `&lastDocId=${lastId}`;
            }
            const data = await authenticatedFetch(url);
            
            setNotifications(prev => lastId ? [...prev, ...data.notifications] : data.notifications);
            setLastDocId(data.lastDocId);
            setHasMore(data.hasMore);
        } catch (err) {
            setError('Failed to load notifications.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user, authenticatedFetch, hasMore]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                setUser(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]); // Removed fetchNotifications from dependency array as it's a useCallback

    const handleAction = async (action, notifId = null) => {
        try {
            if (action === 'mark_all_read' || action === 'delete_all') {
                await authenticatedFetch('/api/notifications/inapp/bulk-update', {
                    method: 'POST',
                    body: JSON.stringify({ action })
                });
            } else if (action === 'delete_one' && notifId) {
                await authenticatedFetch(`/api/notifications/inapp/${notifId}`, { method: 'DELETE' });
            }
            // Simple refresh after any action
            setHasMore(true); // Reset pagination
            fetchNotifications();
        } catch (err) {
            console.error(`Failed to perform action ${action}:`, err);
            setError('An error occurred. Please try again.');
        }
    };

    if (loading) {
        return <div className="text-center p-10"><Spinner /></div>;
    }

    if (!user) {
        return (
            <div className="text-center p-10 bg-white shadow-md rounded-lg max-w-md mx-auto mt-20">
                <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                <p className="mb-6">You must be logged in to view your notifications.</p>
                <button onClick={() => router.push('/auth/login')} className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    Go to Login
                </button>
            </div>
        );
    }
    
    return (
        <div className="bg-white shadow-lg rounded-lg max-w-4xl mx-auto">
            <div className="p-6 border-b flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><InboxIcon /> All Notifications</h1>
                <div className="flex gap-2">
                    <button onClick={() => handleAction('mark_all_read')} className="text-xs font-semibold text-blue-600 hover:underline">Mark All as Read</button>
                    <button onClick={() => handleAction('delete_all')} className="text-xs font-semibold text-red-600 hover:underline">Clear All</button>
                </div>
            </div>

            <div className="divide-y divide-gray-100">
                {error && <p className="p-4 text-red-600">{error}</p>}
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <NotificationItem key={notif.id} notification={notif} onDelete={() => handleAction('delete_one', notif.id)} />
                    ))
                ) : (
                    <p className="p-10 text-center text-gray-500">Your notification feed is empty.</p>
                )}
            </div>
            
            {hasMore && (
                <div className="p-4 text-center">
                    <button onClick={() => fetchNotifications(lastDocId)} disabled={loadingMore} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded hover:bg-gray-300 transition-colors disabled:opacity-50">
                        {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
}

// Sub-component for each notification item
const NotificationItem = ({ notification, onDelete }) => (
    <div className={`p-4 flex items-start gap-4 group ${!notification.read ? 'bg-blue-50' : 'bg-white'}`}>
        <span className={`flex-shrink-0 mt-1 w-2.5 h-2.5 rounded-full ${!notification.read ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
        <div className="w-full">
            <Link href={notification.link || '#'} className={notification.link ? 'hover:underline' : 'pointer-events-none'}>
                <p className="font-semibold text-gray-800">{notification.title}</p>
            </Link>
            <p className="text-sm text-gray-600">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onDelete} aria-label="Delete notification" className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100">
                <TrashIcon />
            </button>
        </div>
    </div>
);


// --- Main Page Export with Suspense and Layout ---
export default function AllNotificationsPage() {
    return (
        <div className="min-h-screen font-sans bg-cyan-200">
            <NavigationBar />
            <main className="p-4 sm:p-6 lg:p-8">
                <Suspense fallback={<div className="text-center p-10"><Spinner/></div>}>
                    <AllNotifications />
                </Suspense>
            </main>
        </div>
    );
}