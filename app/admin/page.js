'use client';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import {auth,db} from '@/lib/firebaseClient.js'; // Import the initialized auth and db objects

// Main App Component
function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contentId, setContentId] = useState('');
  const [newContentTitle, setNewContentTitle] = useState('');

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Force refresh the ID token to ensure it has the latest custom claims
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
    setApiError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle updating user and idToken state
    } catch (error) {
      console.error('Login Error:', error);
      setApiError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle User Logout
  const handleLogout = async () => {
    setLoading(true);
    setApiError(null);
    try {
      await signOut(auth);
      setApiResponse(null); // Clear previous API response
    } catch (error) {
      console.error('Logout Error:', error);
      setApiError(`Logout failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generic API Call Function
  const makeApiCall = async (method, endpoint, body = null, params = {}) => {
    setLoading(true);
    setApiResponse(null);
    setApiError(null);

    if (!idToken) {
      setApiError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    let url = `/api/admin${endpoint}`;
    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.status}`);
      }
      setApiResponse(data);
    } catch (error) {
      console.error('API Call Error:', error);
      setApiError(`API Call Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // API Call Handlers
  const handleGetAnalytics = () => makeApiCall('GET', '');

  const handlePostContent = () => {
    const newContent = {
      title: newContentTitle || 'New Test Content',
      author: user?.email || 'Unknown',
      content: 'This is test content from the React app.',
      popularity: Math.floor(Math.random() * 100)
    };
    makeApiCall('POST', '', newContent);
  };

  const handlePutContent = () => {
    if (!contentId) {
      setApiError('Please enter a Content ID to update.');
      return;
    }
    const updatedContent = {
      title: `Updated Title - ${new Date().toLocaleTimeString()}`
    };
    makeApiCall('PUT', '', updatedContent, { id: contentId });
  };

  const handleDeleteContent = () => {
    if (!contentId) {
      setApiError('Please enter a Content ID to delete.');
      return;
    }
    makeApiCall('DELETE', '', null, { id: contentId, type: 'content' });
  };

  const handleDeleteUser = () => {
    if (!contentId) { // Reusing contentId field for UID
      setApiError('Please enter a User ID (UID) to delete.');
      return;
    }
    makeApiCall('DELETE', '', null, { id: contentId, type: 'users' });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-6 rounded-md p-2 bg-blue-50">Admin API Tester 🔑</h1>

        {/* Authentication Section */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Authentication</h2>
          {user ? (
            <div>
              <p className="mb-2 text-green-700">
                Logged in as: <span className="font-bold">{user.email}</span> (UID: <span className="font-bold">{user.uid}</span>)
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

        {/* API Interaction Section */}
        {user && ( // Only show API interaction if logged in
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-green-800">API Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={handleGetAnalytics}
                className="bg-purple-600 text-white py-3 px-6 rounded-md shadow-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 flex items-center justify-center space-x-2"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-8-8a8 8 0 1116 0A8 8 0 012 10zm11-1a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1zm-4-1a1 1 0 011 1v5a1 1 0 11-2 0V9a1 1 0 011-1zm-4-1a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>{loading && apiResponse === null ? 'Fetching...' : 'GET Analytics'}</span>
              </button>

              <div className="col-span-1 md:col-span-2">
                <input
                  type="text"
                  placeholder="New Content Title"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 mb-2"
                  value={newContentTitle}
                  onChange={(e) => setNewContentTitle(e.target.value)}
                />
                <button
                  onClick={handlePostContent}
                  className="bg-green-600 text-white py-3 px-6 rounded-md shadow-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 w-full flex items-center justify-center space-x-2"
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>{loading && apiResponse === null ? 'Adding...' : 'POST New Content'}</span>
                </button>
              </div>

              <div className="col-span-1 md:col-span-2">
                <input
                  type="text"
                  placeholder="Content ID or User UID for Update/Delete"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 mb-2"
                  value={contentId}
                  onChange={(e) => setContentId(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handlePutContent}
                    className="bg-yellow-600 text-white py-3 px-6 rounded-md shadow-md hover:bg-yellow-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 flex items-center justify-center space-x-2"
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                    <span>{loading && apiResponse === null ? 'Updating...' : 'PUT Update Content'}</span>
                  </button>
                  <button
                    onClick={handleDeleteContent}
                    className="bg-red-600 text-white py-3 px-6 rounded-md shadow-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center justify-center space-x-2"
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 3a1 1 0 000 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
                    </svg>
                    <span>{loading && apiResponse === null ? 'Deleting...' : 'DELETE Content'}</span>
                  </button>
                </div>
                <button
                    onClick={handleDeleteUser}
                    className="bg-orange-600 text-white py-3 px-6 rounded-md shadow-md hover:bg-orange-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 w-full mt-4 flex items-center justify-center space-x-2"
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>{loading && apiResponse === null ? 'Deleting User...' : 'DELETE User by UID'}</span>
                  </button>
              </div>
            </div>
          </div>
        )}

        {/* Response/Error Display */}
        {(apiResponse || apiError) && (
          <div 
            className={`mt-8 p-4 rounded-lg border ${apiError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'}`}
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Response:</h2>
            {loading && <p className="text-blue-500">Loading...</p>}
            {apiError && <pre className="text-red-600 whitespace-pre-wrap">{apiError}</pre>}
            {apiResponse && <pre className="text-gray-900 whitespace-pre-wrap">{JSON.stringify(apiResponse, null, 2)}</pre>}
          </div>
        )}

        {/* Important Note */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
          <p className="font-bold mb-2">Important Note: Admin Claim Required!</p>
          <p>This app expects the logged-in Firebase user to have the custom claim <code className="bg-yellow-200 p-1 rounded-sm">admin: true</code> set in their Firebase profile.</p>
          <p>You can set this claim using your backend script:</p>
          <code className="block bg-yellow-200 p-2 rounded-md mt-2">node scripts/set-admin.js &lt;user-uid&gt;</code>
          <p className="mt-2">After setting the claim, ensure you log in to this app with that user to get a fresh ID token with the claim embedded.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
