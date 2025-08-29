"use client"; // This marks the component as a client component

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import {auth,db} from '@/lib/firebaseClient'; // Ensure this path is correct
function SetAdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [targetUid, setTargetUid] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Force refresh the ID token to ensure it has the latest custom claims
        // This is important because the "admin" claim is needed to call the API.
        const token = await currentUser.getIdToken(true);
        setIdToken(token);
      } else {
        setIdToken(null);
      }
    });
    return () => unsubscribe(); // Cleanup subscription
  }, []);

  // Handle User Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponseMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle updating user and idToken state
    } catch (err) {
      console.error('Login Error:', err);
      setError(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle User Logout
  const handleLogout = async () => {
    setLoading(true);
    setError('');
    setResponseMessage('');
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout Error:', err);
      setError(`Logout failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Setting Admin Claim
  const handleSetAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponseMessage('');

    if (!user || !idToken) {
      setError('You must be logged in to set admin claims.');
      setLoading(false);
      return;
    }
    if (!targetUid) {
      setError('Please enter a User UID.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/set-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: targetUid }),
      });

      const data = await response.json();

      if (response.ok) {
        setResponseMessage(data.message || `Successfully set admin claim for ${targetUid}`);
      } else {
        throw new Error(data.message || 'Failed to set admin claim.');
      }
    } catch (err) {
      console.error('API Call Error:', err);
      setError(`Error setting admin claim: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6 rounded-md p-2 bg-indigo-50">Set User as Admin 👑</h1>

        {/* Authentication Section */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">1. Log In as Existing Admin</h2>
          {user ? (
            <div>
              <p className="mb-2 text-green-700">
                Logged in as: <span className="font-bold">{user.email}</span> (UID: <span className="font-bold">{user.uid}</span>)
                <br/>
                <span className="text-sm italic">
                  (Ensure this user already has the 'admin: true' claim set on the backend)
                </span>
              </p>
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                disabled={loading}
              >
                {loading ? 'Logging Out...' : 'Logout'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Admin Email"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <input
                  type="password"
                  placeholder="Admin Password"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                disabled={loading}
              >
                {loading ? 'Logging In...' : 'Login as Admin'}
              </button>
            </form>
          )}
        </div>

        {/* Set Admin Claim Section */}
        {user && ( // Only show if logged in
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-purple-800">2. Set Admin Claim for Another User</h2>
            <form onSubmit={handleSetAdmin}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Target User UID (e.g., abcdefg12345)"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md shadow-md hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex items-center justify-center space-x-2"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17.555 10.741a1 1 0 00-.773-.707c-2.432-.635-4.837-.878-7.234-.734l-.626-.031A6.035 6.035 0 0110 5a5 5 0 105 5c0 .324-.047.645-.138.953l-.715.143zM10 18a8 8 0 100-16 8 8 0 000 16z" />
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>{loading ? 'Setting Admin...' : 'Set User as Admin'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Response/Error Display */}
        {(responseMessage || error) && (
          <div
            className={`mt-8 p-4 rounded-lg border ${error ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'}`}
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Result:</h2>
            {loading && <p className="text-blue-500">Processing...</p>}
            {error && <pre className="text-red-600 whitespace-pre-wrap">{error}</pre>}
            {responseMessage && <pre className="text-green-800 whitespace-pre-wrap">{responseMessage}</pre>}
          </div>
        )}

        {/* Important Note */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
          <p className="font-bold mb-2">How it Works:</p>
          <p>1. **Log in** with a Firebase user who *already has* the <code className="bg-yellow-200 p-1 rounded-sm">admin: true</code> claim. This is essential for authorization.</p>
          <p>2. Enter the **UID** of the user you wish to promote to admin in the input field.</p>
          <p>3. Click **"Set User as Admin"**. This sends a request to your Next.js backend, which uses the Firebase Admin SDK to set the claim.</p>
          <p className="mt-2">After a user is made admin, their refresh tokens are revoked to ensure they get an updated ID token with the new claim upon their next login.</p>
        </div>
      </div>
    </div>
  );
}

export default SetAdminPage;
