'use client';
import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient.js';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken(true);
        setIdToken(token);
      } else {
        setIdToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setApiError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setApiResponse(null);
    } catch (error) {
      setApiError(`Logout failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
    if (queryString) url += `?${queryString}`;

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `API Error: ${response.status}`);

      setApiResponse(data);
    } catch (error) {
      setApiError(`API Call Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAnalytics = () => makeApiCall('GET', '');
  const handlePostContent = () => {
    const newContent = {
      title: newContentTitle || 'New Test Content',
      author: user?.email || 'Unknown',
      content: 'This is test content from the React app.',
      popularity: Math.floor(Math.random() * 100),
    };
    makeApiCall('POST', '', newContent);
  };
  const handlePutContent = () => {
    if (!contentId) return setApiError('Enter a Content ID to update.');
    makeApiCall('PUT', '', { title: `Updated - ${new Date().toLocaleTimeString()}` }, { id: contentId });
  };
  const handleDeleteContent = () => {
    if (!contentId) return setApiError('Enter a Content ID to delete.');
    makeApiCall('DELETE', '', null, { id: contentId, type: 'content' });
  };
  const handleDeleteUser = () => {
    if (!contentId) return setApiError('Enter a User UID to delete.');
    makeApiCall('DELETE', '', null, { id: contentId, type: 'users' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-6">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8 w-full max-w-3xl text-white">
        <h1 className="text-4xl font-extrabold text-center mb-8 drop-shadow-lg">🔑 Admin API Tester</h1>

        {/* Auth Section */}
        <div className="mb-8 p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20">
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          {user ? (
            <div>
              <p className="mb-2 text-green-300">Logged in as: <b>{user.email}</b></p>
              <button
                onClick={handleLogout}
                className="w-full bg-red-500 hover:bg-red-600 transition-all duration-200 py-2 px-4 rounded-lg font-medium"
                disabled={loading}
              >
                {loading ? 'Logging Out...' : 'Logout'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Admin Email"
                className="w-full mb-3 p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Admin Password"
                className="w-full mb-4 p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 py-2 px-4 rounded-lg font-medium transition-all duration-200"
                disabled={loading}
              >
                {loading ? 'Logging In...' : 'Login'}
              </button>
            </form>
          )}
        </div>

        {/* API Section */}
        {user && (
          <div className="mb-8 p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20">
            <h2 className="text-2xl font-semibold mb-4">API Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleGetAnalytics} className="bg-purple-500 hover:bg-purple-600 rounded-lg py-2 px-4">GET Analytics</button>
              <button onClick={handlePostContent} className="bg-green-500 hover:bg-green-600 rounded-lg py-2 px-4">POST Content</button>
              <button onClick={handlePutContent} className="bg-yellow-500 hover:bg-yellow-600 rounded-lg py-2 px-4">PUT Update</button>
              <button onClick={handleDeleteContent} className="bg-red-500 hover:bg-red-600 rounded-lg py-2 px-4">DELETE Content</button>
              <button onClick={handleDeleteUser} className="bg-orange-500 hover:bg-orange-600 rounded-lg py-2 px-4 sm:col-span-2">DELETE User</button>
            </div>
          </div>
        )}

        {/* Response */}
        {(apiResponse || apiError) && (
          <div className="p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 text-sm">
            <h2 className="text-xl font-semibold mb-2">Response:</h2>
            {apiError && <pre className="text-red-300">{apiError}</pre>}
            {apiResponse && <pre className="text-green-200">{JSON.stringify(apiResponse, null, 2)}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
