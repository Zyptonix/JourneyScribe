'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import {auth,db} from '@/lib/firebaseClient'; // Adjust path as needed
import NavigationBarLight from '@/components/NavigationBarLight';
import NavigationBarDark from '@/components/NavigationBarDark';
import NavigationBar from '@/components/NavigationBar';
// --- SVG Icons for a better UI ---
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
const InboxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
const Spinner = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- Main App Component ---
const App = () => {
    // --- State Management ---
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState(null);
    
    // Subscription form state
    const [notificationType, setNotificationType] = useState('');
    const [criteria, setCriteria] = useState('');
    const [channels, setChannels] = useState([]);
    const [subscribeMessage, setSubscribeMessage] = useState({ text: '', type: '' });
    const [isSubscribing, setIsSubscribing] = useState(false);

    // Preferences state
    const [preferences, setPreferences] = useState([]);
    const [preferencesMessage, setPreferencesMessage] = useState({ text: '', type: '' });
    const [isPreferencesLoading, setIsPreferencesLoading] = useState(true);

    // In-App notifications state
    const [inAppNotifications, setInAppNotifications] = useState([]);
    const [lastDocId, setLastDocId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isInAppLoading, setIsInAppLoading] = useState(true);

    // Test email state
    const [testEmail, setTestEmail] = useState({ to: '', subject: '', content: '' });
    const [testEmailMessage, setTestEmailMessage] = useState({ text: '', type: '' });
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // --- Constants ---
    const API_BASE_URL = '/api/notifications'; // Use relative URL
    const SEND_EMAIL_API_URL = '/api/send-email';

    // --- Reusable Authenticated Fetch Function ---
    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!user) {
            throw new Error("User is not authenticated.");
        }
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


    // --- Authentication Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setIsAuthReady(true);
            } else {
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (initialAuthToken) {
                    try {
                        const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                        setUser(userCredential.user);
                    } catch (err) {
                        console.error("Custom token sign-in failed:", err);
                        setError("Authentication failed. Unable to sign in with the provided token.");
                    } finally {
                        setIsAuthReady(true);
                    }
                } else {
                    // If no token and no current user, set an error. No anonymous fallback.
                    setError("No authenticated user found. Please ensure you are logged in to use the application.");
                    setIsAuthReady(true); // Stop the loading state
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // --- Data Fetching Callbacks ---
    const fetchPreferences = useCallback(async () => {
        if (!isAuthReady || !user) return;
        setIsPreferencesLoading(true);
        setPreferencesMessage({ text: '', type: '' });
        try {
            const data = await authenticatedFetch(`${API_BASE_URL}/preferences`);
            setPreferences(data);
        } catch (err) {
            setPreferencesMessage({ text: `Failed to load preferences: ${err.message}`, type: 'error' });
        } finally {
            setIsPreferencesLoading(false);
        }
    }, [isAuthReady, user, authenticatedFetch]);

    const fetchInAppNotifications = useCallback(async (loadMore = false) => {
        if (!isAuthReady || !user || (!hasMore && loadMore)) return;
        setIsInAppLoading(true);
        
        const currentLastDocId = loadMore ? lastDocId : null;
        let url = `${API_BASE_URL}/inapp?limit=5`;
        if (currentLastDocId) {
            url += `&lastDocId=${currentLastDocId}`;
        }

        try {
            const data = await authenticatedFetch(url);
            setInAppNotifications(prev => loadMore ? [...prev, ...data.notifications] : data.notifications);
            setLastDocId(data.lastDocId);
            setHasMore(data.hasMore);
        } catch (err) {
            setError(`Failed to load notifications: ${err.message}`);
        } finally {
            setIsInAppLoading(false);
        }
    }, [isAuthReady, user, authenticatedFetch, hasMore, lastDocId]);

    // --- Initial Data Load Effect ---
    useEffect(() => {
        if (isAuthReady && user) {
            fetchPreferences();
            fetchInAppNotifications(false);
        }
    }, [isAuthReady, user, fetchPreferences, fetchInAppNotifications]);

    // --- Event Handlers ---
    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!notificationType || channels.length === 0) {
            setSubscribeMessage({ text: 'Please provide a type and select a channel.', type: 'error' });
            return;
        }
        setIsSubscribing(true);
        setSubscribeMessage({ text: 'Subscribing...', type: 'info' });
        try {
            await authenticatedFetch(`${API_BASE_URL}/subscribe`, {
                method: 'POST',
                body: JSON.stringify({
                    type: notificationType,
                    criteria: criteria || 'general', // Send criteria, fallback to a default
                    channels,
                    enabled: true
                }),
            });
            setSubscribeMessage({ text: 'Subscription successful!', type: 'success' });
            setNotificationType('');
            setCriteria('');
            setChannels([]);
            fetchPreferences(); // Refresh list
        } catch (err) {
            setSubscribeMessage({ text: `Subscription failed: ${err.message}`, type: 'error' });
        } finally {
            setIsSubscribing(false);
        }
    };

    const handleTogglePreference = async (type, currentEnabled) => {
        // Optimistic UI update
        setPreferences(prefs => prefs.map(p => p.type === type ? { ...p, enabled: !currentEnabled } : p));
        try {
            await authenticatedFetch(`${API_BASE_URL}/preferences`, {
                method: 'PUT',
                body: JSON.stringify({ type, updates: { enabled: !currentEnabled } }),
            });
        } catch (err) {
            // Revert on failure
            setPreferences(prefs => prefs.map(p => p.type === type ? { ...p, enabled: currentEnabled } : p));
            setPreferencesMessage({ text: `Update failed: ${err.message}`, type: 'error' });
        }
    };

    const handleSendTestEmail = async (e) => {
        e.preventDefault();
        setIsSendingEmail(true);
        setTestEmailMessage({ text: 'Sending...', type: 'info' });
        try {
            await authenticatedFetch(SEND_EMAIL_API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    to: testEmail.to,
                    subject: testEmail.subject,
                    textContent: testEmail.content,
                    htmlContent: `<p>${testEmail.content}</p>`
                }),
            });
            setTestEmailMessage({ text: 'Test email sent successfully!', type: 'success' });
            setTestEmail({ to: '', subject: '', content: '' });
        } catch (err) {
            setTestEmailMessage({ text: `Failed to send: ${err.message}`, type: 'error' });
        } finally {
            setIsSendingEmail(false);
        }
    };

    // --- Render Logic ---
    if (!isAuthReady) {
        return <div className="flex items-center justify-center min-h-screen bg-slate-100"><div className="text-xl font-semibold text-slate-700">Initializing...</div></div>;
    }

    if (error) {
        return <div className="flex items-center justify-center min-h-screen bg-red-50"><div className="p-4 text-red-800 bg-red-100 rounded-lg">{error}</div></div>;
    }

    const Message = ({ message }) => {
        if (!message.text) return null;
        const colors = {
            success: 'bg-green-100 text-green-800',
            error: 'bg-red-100 text-red-800',
            info: 'bg-blue-100 text-blue-800',
        };
        return <p className={`mt-4 text-center p-2 rounded-md text-sm ${colors[message.type]}`}>{message.text}</p>;
    };

    return (
        <div className="min-h-screen  font-sans text-slate-800 bg-cyan-500">
            <NavigationBar/>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* --- Top Section: Subscribe and Test Email --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Subscribe Card */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl"><BellIcon /></div>
                            <h2 className="text-2xl font-bold text-slate-800">Subscribe</h2>
                        </div>
                        <form onSubmit={handleSubscribe} className="space-y-4">
                            <input
                                type="text"
                                value={notificationType}
                                onChange={(e) => setNotificationType(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                placeholder="Notification Type (e.g., product_update)"
                                required
                            />
                             <input
                                type="text"
                                value={criteria}
                                onChange={(e) => setCriteria(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                placeholder="Criteria (e.g., product_id_123)"
                            />
                            <div className="flex flex-wrap gap-4 pt-2">
                                {['email', 'in_app'].map(channel => (
                                    <label key={channel} className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            value={channel}
                                            checked={channels.includes(channel)}
                                            onChange={(e) => setChannels(c => e.target.checked ? [...c, channel] : c.filter(item => item !== channel))}
                                            className="h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="capitalize">{channel.replace('_', '-')}</span>
                                    </label>
                                ))}
                            </div>
                            <button type="submit" disabled={isSubscribing} className="w-full flex justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                                {isSubscribing ? <Spinner /> : 'Subscribe'}
                            </button>
                            <Message message={subscribeMessage} />
                        </form>
                    </section>
                    
                    {/* Test Email Card */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="bg-green-100 text-green-600 p-3 rounded-xl"><MailIcon /></div>
                            <h2 className="text-2xl font-bold text-slate-800">Simulate Email</h2>
                        </div>
                        <form onSubmit={handleSendTestEmail} className="space-y-4">
                            <input type="email" value={testEmail.to} onChange={e => setTestEmail({...testEmail, to: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="Recipient Email" required />
                            <input type="text" value={testEmail.subject} onChange={e => setTestEmail({...testEmail, subject: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="Subject" required />
                            <textarea value={testEmail.content} onChange={e => setTestEmail({...testEmail, content: e.target.value})} rows="1" className="w-full p-3 border border-slate-300 rounded-lg" placeholder="Message content..." required></textarea>
                            <button type="submit" disabled={isSendingEmail} className="w-full flex justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition">
                                {isSendingEmail ? <Spinner /> : 'Send Test Email'}
                            </button>
                            <Message message={testEmailMessage} />
                        </form>
                    </section>
                </div>

                {/* --- Main Content: Preferences and In-App Feed --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Preferences Column */}
                    <section className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                         <div className="flex items-center gap-4 mb-5">
                            <div className="bg-purple-100 text-purple-600 p-3 rounded-xl"><SettingsIcon /></div>
                            <h2 className="text-2xl font-bold text-slate-800">Preferences</h2>
                        </div>
                        <Message message={preferencesMessage} />
                        {isPreferencesLoading ? <p className="text-slate-500">Loading...</p> : 
                            preferences.length > 0 ? (
                                <div className="space-y-4">
                                    {preferences.map(pref => (
                                        <div key={pref.type} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <h3 className="font-semibold capitalize text-slate-800">{pref.type.replace(/_/g, ' ')}</h3>
                                            <p className="text-sm text-slate-600">Criteria: {pref.criteria}</p>
                                            <p className="text-sm text-slate-500 mb-2">Channels: {pref.channels.join(', ')}</p>
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                                <span className="text-sm font-medium">Enabled</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={pref.enabled} onChange={() => handleTogglePreference(pref.type, pref.enabled)} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-center text-slate-500 p-4 bg-slate-100 rounded-lg">No preferences set.</p>
                        }
                    </section>

                    {/* In-App Notifications Column */}
                    <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl"><InboxIcon /></div>
                            <h2 className="text-2xl font-bold text-slate-800">In-App Feed</h2>
                        </div>
                        {isInAppLoading && inAppNotifications.length === 0 ? <p className="text-slate-500">Loading feed...</p> : 
                            inAppNotifications.length > 0 ? (
                                <div className="space-y-4">
                                    {inAppNotifications.map(notif => (
                                        <div key={notif.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 transition hover:shadow-md hover:border-indigo-200">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`flex-shrink-0 mt-1 w-2.5 h-2.5 rounded-full ${notif.read ? 'bg-slate-400' : 'bg-green-500'}`}></span>
                                                    <div>
                                                        <h3 className="font-semibold capitalize">{notif.type?.replace(/_/g, ' ')}</h3>
                                                        <p className="text-slate-600">{notif.message}</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-400 text-right flex-shrink-0">{new Date(notif.timestamp._seconds * 1000).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <div className="pt-4">
                                            <button onClick={() => fetchInAppNotifications(true)} disabled={isInAppLoading} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
                                                {isInAppLoading ? 'Loading...' : 'Load More'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : <p className="text-center text-slate-500 p-4 bg-slate-100 rounded-lg">Your notification feed is empty.</p>
                        }
                    </section>
                </div>
            </main>
        </div>
    );
};

export default App;
