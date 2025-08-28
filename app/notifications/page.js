'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, collection, getDocs, query, limit, startAfter, getDoc } from 'firebase/firestore';
import {auth,db} from '@/lib/firebaseClient'; // Adjust path as needed
import NavigationBar from '@/components/NavigationBar';
import NavigationBarLight from '@/components/NavigationBarLight';
// Helper function to handle Firebase authentication and get user ID
async function setupFirebaseUser() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Unsubscribe after the first state change
            if (user) {
                resolve(user.uid);
            } else {
                if (initialAuthToken) {
                    try {
                        const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                        resolve(userCredential.user.uid);
                    } catch (error) {
                        console.error("Error signing in with custom token:", error);
                        // Fallback to anonymous sign-in on custom token error
                        try {
                            const anonymousUserCredential = await signInAnonymously(auth);
                            resolve(anonymousUserCredential.user.uid);
                        } catch (anonError) {
                            console.error("Error signing in anonymously:", anonError);
                            reject(anonError);
                        }
                    }
                } else {
                    // Sign in anonymously if no custom token
                    try {
                        const anonymousUserCredential = await signInAnonymously(auth);
                        resolve(anonymousUserCredential.user.uid);
                    } catch (anonError) {
                        console.error("Error signing in anonymously:", anonError);
                        reject(anonError);
                    }
                }
            }
        }, (error) => {
            console.error("onAuthStateChanged error:", error);
            reject(error);
        });
    });
}


const App = () => {
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notificationType, setNotificationType] = useState('');
    const [criteria, setCriteria] = useState('');
    const [channels, setChannels] = useState([]);
    const [preferences, setPreferences] = useState([]);
    const [inAppNotifications, setInAppNotifications] = useState([]);
    const [lastDocId, setLastDocId] = useState(null);
    const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
    const [subscribeMessage, setSubscribeMessage] = useState('');
    const [preferencesMessage, setPreferencesMessage] = useState('');

    // New states for test email simulation
    const [testEmailRecipient, setTestEmailRecipient] = useState('');
    const [testEmailSubject, setTestEmailSubject] = useState('');
    const [testEmailContent, setTestEmailContent] = useState('');
    const [testEmailMessage, setTestEmailMessage] = useState('');


    const API_BASE_URL = 'http://localhost:9243/api/notifications'; // Adjust if your API is on a different port/domain
    const SEND_EMAIL_API_URL = 'http://localhost:9243/api/send-email'; // Direct API for sending email

    // --- Authentication and Initial Data Load ---
    useEffect(() => {
        const initializeAppAndUser = async () => {
            try {
                const uid = await setupFirebaseUser();
                setUserId(uid);
                await fetchPreferences(uid);
                await fetchInAppNotifications(uid, null, true); // Fetch initial notifications
            } catch (err) {
                setError('Failed to initialize application or authenticate: ' + err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        initializeAppAndUser();
    }, []);

    // --- Fetch Notification Preferences ---
    const fetchPreferences = useCallback(async (currentUserId) => {
        if (!currentUserId) return;
        setPreferencesMessage('Loading preferences...');
        try {
            const response = await fetch(`${API_BASE_URL}/preferences`);
            const data = await response.json();
            if (response.ok) {
                setPreferences(data);
                setPreferencesMessage('');
            } else {
                setPreferencesMessage('Failed to load preferences: ' + data.error);
                console.error('Failed to load preferences:', data);
            }
        } catch (err) {
            setPreferencesMessage('Error loading preferences: ' + err.message);
            console.error('Error fetching preferences:', err);
        }
    }, []);

    // --- Fetch In-App Notifications with Pagination ---
    const fetchInAppNotifications = useCallback(async (currentUserId, currentLastDocId, isInitialFetch = false) => {
        if (!currentUserId) return;
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/inapp?limit=5`;
            if (currentLastDocId) {
                url += `&lastDocId=${currentLastDocId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                setInAppNotifications(prev => isInitialFetch ? data.notifications : [...prev, ...data.notifications]);
                setLastDocId(data.lastDocId);
                setHasMoreNotifications(data.hasMore);
            } else {
                setError('Failed to load in-app notifications: ' + data.error);
                console.error('Failed to load in-app notifications:', data);
            }
        } catch (err) {
            setError('Error fetching in-app notifications: ' + err.message);
            console.error('Error fetching in-app notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);


 // --- Handle Subscribe Form Submission ---
    const handleSubscribe = async (e) => {
        e.preventDefault();
        setSubscribeMessage('Subscribing...');
        if (!userId) {
            setSubscribeMessage('Error: User not authenticated.');
            return;
        }
        if (!notificationType || channels.length === 0) {
            setSubscribeMessage('Please fill in notification type and select at least one channel.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId, // Passed from client for the API to use (though API uses auth context mostly)
                    type: notificationType,
                    criteria: criteria || 'default', // Can be any string for now
                    channels,
                    enabled: true // Default to enabled on subscribe
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setSubscribeMessage('Subscription successful!');
                setNotificationType('');
                setCriteria('');
                setChannels([]);
                fetchPreferences(userId); // Refresh preferences after subscribing
            } else {
                setSubscribeMessage('Subscription failed: ' + data.error);
                console.error('Subscription failed:', data);
            }
        } catch (err) {
            setSubscribeMessage('Error subscribing: ' + err.message);
            console.error('Error during subscription:', err);
        }
    };

    // --- Handle Preference Toggle (Enable/Disable) ---
    const handleTogglePreference = async (typeToUpdate, currentEnabledState) => {
        setPreferencesMessage('Updating preference...');
        if (!userId) {
            setPreferencesMessage('Error: User not authenticated.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: typeToUpdate,
                    updates: { enabled: !currentEnabledState },
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setPreferencesMessage('Preference updated successfully!');
                fetchPreferences(userId); // Refresh preferences after update
            } else {
                setPreferencesMessage('Failed to update preference: ' + data.error);
                console.error('Failed to update preference:', data);
            }
        } catch (err) {
            setPreferencesMessage('Error updating preference: ' + err.message);
            console.error('Error during preference update:', err);
        }
    };

    // --- Handle Test Email Submission ---
    const handleSendTestEmail = async (e) => {
        e.preventDefault();
        setTestEmailMessage('Sending test email...');

        if (!testEmailRecipient || !testEmailSubject || !testEmailContent) {
            setTestEmailMessage('Please fill in all test email fields.');
            return;
        }

        try {
            const response = await fetch(SEND_EMAIL_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: testEmailRecipient,
                    subject: testEmailSubject,
                    textContent: testEmailContent,
                    htmlContent: `<p>${testEmailContent}</p><p>This is a test email sent from the frontend simulation.</p>`
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setTestEmailMessage('Test email sent successfully!');
                setTestEmailRecipient('');
                setTestEmailSubject('');
                setTestEmailContent('');
            } else {
                setTestEmailMessage('Failed to send test email: ' + (data.details?.message || data.error));
                console.error('Failed to send test email:', data);
            }
        } catch (err) {
            setTestEmailMessage('Error sending test email: ' + err.message);
            console.error('Error sending test email:', err);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                <p className="text-lg text-gray-700">Loading application...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 p-4 rounded-lg shadow-md">
                <p className="text-lg">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100  font-inter ">
            <div className="relative top-0 w-full z-50">
                <NavigationBarLight/>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 text-gray-800 rounded-lg shadow-lg">

            <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-indigo-700 mb-8 mt-4 rounded-xl p-3 shadow-md bg-white">
                👋 Notification Hub
            </h1>

            {userId && (
                <p className="text-center text-sm mb-6 bg-indigo-100 text-indigo-800 p-2 rounded-lg">
                    Logged in as User ID: <span className="font-mono break-all">{userId}</span>
                </p>
            )}

            {/* Simulate Test Email Section */}
            <section className="bg-white p-6 rounded-xl shadow-xl mb-8 border border-green-200">
                <h2 className="text-3xl font-bold text-green-600 mb-6 text-center">✉️ Simulate Test Email</h2>
                <form onSubmit={handleSendTestEmail} className="space-y-6 max-w-lg mx-auto">
                    <div>
                        <label htmlFor="testEmailRecipient" className="block text-sm font-medium text-gray-700 mb-2">
                            Recipient Email
                        </label>
                        <input
                            type="email"
                            id="testEmailRecipient"
                            value={testEmailRecipient}
                            onChange={(e) => setTestEmailRecipient(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g., your_email@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="testEmailSubject" className="block text-sm font-medium text-gray-700 mb-2">
                            Subject
                        </label>
                        <input
                            type="text"
                            id="testEmailSubject"
                            value={testEmailSubject}
                            onChange={(e) => setTestEmailSubject(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g., Important Update"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="testEmailContent" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Content (Plain Text)
                        </label>
                        <textarea
                            id="testEmailContent"
                            value={testEmailContent}
                            onChange={(e) => setTestEmailContent(e.target.value)}
                            rows="4"
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="Enter your email message here..."
                            required
                        ></textarea>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                        Send Test Email
                    </button>
                    {testEmailMessage && (
                        <p className={`mt-4 text-center ${testEmailMessage.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                            {testEmailMessage}
                        </p>
                    )}
                </form>
            </section>

            <hr className="my-8 border-t-2 border-green-200" />

            {/* Subscribe to Notifications Section */}
            <section className="bg-white p-6 rounded-xl shadow-xl mb-8 border border-indigo-200">
                <h2 className="text-3xl font-bold text-indigo-600 mb-6 text-center">🔔 Subscribe to Notifications</h2>
                <form onSubmit={handleSubscribe} className="space-y-6 max-w-lg mx-auto">
                    <div>
                        <label htmlFor="notificationType" className="block text-sm font-medium text-gray-700 mb-2">
                            Notification Type (e.g., flight_price_drop, new_message)
                        </label>
                        <input
                            type="text"
                            id="notificationType"
                            value={notificationType}
                            onChange={(e) => setNotificationType(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., product_update"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="criteria" className="block text-sm font-medium text-gray-700 mb-2">
                            Criteria (e.g., 'London to Paris', 'Product A ID')
                        </label>
                        <input
                            type="text"
                            id="criteria"
                            value={criteria}
                            onChange={(e) => setCriteria(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Optional criteria for the notification"
                        />
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Channels</span>
                        <div className="flex flex-wrap gap-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    value="email"
                                    checked={channels.includes('email')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setChannels([...channels, 'email']);
                                        } else {
                                            setChannels(channels.filter((c) => c !== 'email'));
                                        }
                                    }}
                                    className="h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-gray-700">Email</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    value="in_app"
                                    checked={channels.includes('in_app')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setChannels([...channels, 'in_app']);
                                        } else {
                                            setChannels(channels.filter((c) => c !== 'in_app'));
                                        }
                                    }}
                                    className="h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-gray-700">In-App</span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Subscribe
                    </button>
                    {subscribeMessage && (
                        <p className={`mt-4 text-center ${subscribeMessage.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                            {subscribeMessage}
                        </p>
                    )}
                </form>
            </section>

            <hr className="my-8 border-t-2 border-indigo-200" />

            {/* Notification Preferences Section */}
            <section className="bg-white p-6 rounded-xl shadow-xl mb-8 border border-purple-200">
                <h2 className="text-3xl font-bold text-purple-600 mb-6 text-center">⚙️ Notification Preferences</h2>
                {preferencesMessage && (
                    <p className="text-center text-gray-600 mb-4">{preferencesMessage}</p>
                )}
                {preferences.length === 0 && !preferencesMessage && (
                    <p className="text-center text-gray-500">No preferences found. Subscribe to a notification type above!</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {preferences.map((pref, index) => (
                        <div key={index} className="bg-purple-50 p-5 rounded-lg shadow-sm border border-purple-100 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-purple-700 mb-2 capitalize">
                                    {pref.type?.replace(/_/g, ' ')}
                                </h3>
                                <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-medium">Criteria:</span> {pref.criteria || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600 mb-3">
                                    <span className="font-medium">Channels:</span> {pref.channels?.join(', ') || 'None'}
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-purple-100 mt-auto">
                                <span className="text-sm font-medium text-gray-700">Enabled:</span>
                                <label htmlFor={`toggle-${pref.type}`} className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id={`toggle-${pref.type}`}
                                        className="sr-only peer"
                                        checked={pref.enabled}
                                        onChange={() => handleTogglePreference(pref.type, pref.enabled)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <hr className="my-8 border-t-2 border-purple-200" />

            {/* In-App Notifications Section */}
            <section className="bg-white p-6 rounded-xl shadow-xl border border-indigo-200">
                <h2 className="text-3xl font-bold text-indigo-600 mb-6 text-center">📬 In-App Notifications</h2>
                {inAppNotifications.length === 0 && !loading && (
                    <p className="text-center text-gray-500">No in-app notifications yet.</p>
                )}
                <div className="space-y-4">
                    {inAppNotifications.map((notif) => (
                        <div key={notif.id} className="bg-indigo-50 p-4 rounded-lg shadow-sm border border-indigo-100">
                            <div className="flex items-center mb-2">
                                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${notif.read ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                                <h3 className="text-lg font-semibold text-indigo-700 capitalize">
                                    {notif.type?.replace(/_/g, ' ')}
                                </h3>
                                <span className="ml-auto text-xs text-gray-500">
                                    {new Date(notif.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-gray-700 text-base mb-2">{notif.message}</p>
                            {notif.details && Object.keys(notif.details).length > 0 && (
                                <details className="text-sm text-gray-600">
                                    <summary className="cursor-pointer font-medium text-indigo-500 hover:text-indigo-700">Details</summary>
                                    <pre className="mt-2 p-2 bg-gray-100 rounded-md overflow-x-auto text-xs">
                                        {JSON.stringify(notif.details, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
                {hasMoreNotifications && (
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={() => fetchInAppNotifications(userId, lastDocId)}
                            disabled={loading}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-5 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                        >
                            {loading ? 'Loading More...' : 'Load More Notifications'}
                        </button>
                    </div>
                )}
            </section>
        </div>
        </div>
    );
};

export default App;
