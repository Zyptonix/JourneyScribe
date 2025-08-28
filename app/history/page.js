'use client';
import React, { useState, useEffect } from 'react';
import {auth,db} from '@/lib/firebaseClient.js';
// This imports all required Firebase services.
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Main App Component
function App() {
  // Global variables provided by the Canvas environment for Firebase setup
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // State variables for application data and UI status

  const [userId, setUserId] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [trips, setTrips] = useState(null);
  const [badges, setBadges] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('history'); // history | leaderboard | badges

  // Goal management state
  const [newGoal, setNewGoal] = useState({ tripId: '', title: '' });

  // 1. Firebase Initialization & Authentication
  // This useEffect runs once on component mount to set up Firebase and authenticate the user.
  useEffect(() => {
    async function initFirebase() {
      try {
       
        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUserId(user.uid);
            const token = await user.getIdToken();
            setIdToken(token);
            console.log("User authenticated with UID:", user.uid);
          } else {
            setUserId(null);
            setIdToken(null);
            console.log("User not authenticated.");
          }
          setIsAuthReady(true);
        });

        // Sign in with the provided custom token
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        }

        return () => unsubscribe(); // Cleanup the auth listener on component unmount
      } catch (e) {
        console.error("Firebase init/auth error:", e);
        setError("Failed to initialize Firebase or authenticate. Check console for details.");
      }
    }
    initFirebase();
  }, [firebaseConfig, initialAuthToken]);

  // 2. Data Fetching
  // This useEffect fetches data based on the active tab and user ID.
  useEffect(() => {
    const fetchData = async () => {
      // Only proceed if authentication is ready and we have a valid ID token.
      if (!isAuthReady || !idToken) {
        setLoading(false);
        // If we are authenticated but don't have a token yet, wait for the next render.
        if (userId) return;
        // If not authenticated, show an error.
        setError('Please log in to view your data.');
        return;
      }

      setLoading(true);
      setError(null);

      let url = `${window.location.origin}/api/history`;

      // Determine the API endpoint based on the active tab
      switch (activeTab) {
        case 'history':
          url += `?userId=${userId}`;
          break;
        case 'leaderboard':
          url += `?type=leaderboard`;
          break;
        case 'badges':
          url += `?type=badges&userId=${userId}`;
          break;
        default:
          setLoading(false);
          return;
      }

      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `API call failed with status: ${response.status}`);
        }

        // Update state based on the fetched data
        if (activeTab === 'history') setTrips(data);
        if (activeTab === 'leaderboard') setLeaderboard(data.leaderboard);
        if (activeTab === 'badges') setBadges(data);

      } catch (e) {
        console.error(`Error fetching ${activeTab} data:`, e);
        setError(`Failed to fetch ${activeTab}. Please try again.`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isAuthReady, userId, idToken]);

  // 3. Goal Management Handlers
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!idToken) {
      setError('You must be logged in to add a goal.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${window.location.origin}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ tripId: newGoal.tripId, title: newGoal.title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add goal');
      // Refetch history to show the update
      setTrips(null);
      setActiveTab('history');
    } catch (e) {
      console.error('Error adding goal:', e);
      setError('Failed to add goal.');
    } finally {
      setLoading(false);
      setNewGoal({ tripId: '', title: '' });
    }
  };

  const handleUpdateGoal = async (tripId, goalId, done) => {
    if (!idToken) {
      setError('You must be logged in to update a goal.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${window.location.origin}/api/history`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ tripId, goalId, done: !done }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update goal');
      // Refetch history to show the update
      setTrips(null);
      setActiveTab('history');
    } catch (e) {
      console.error('Error updating goal:', e);
      setError('Failed to update goal.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (tripId, goalId) => {
    if (!idToken) {
      setError('You must be logged in to delete a goal.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${window.location.origin}/api/history?tripId=${tripId}&goalId=${goalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete goal');
      // Refetch history to show the update
      setTrips(null);
      setActiveTab('history');
    } catch (e) {
      console.error('Error deleting goal:', e);
      setError('Failed to delete goal.');
    } finally {
      setLoading(false);
    }
  };

  // 4. UI Rendering Helpers
  const renderTrips = (tripList) => (
    <div className="space-y-4">
      {tripList && tripList.length > 0 ? (
        tripList.map(trip => (
          <div key={trip.id} className="p-4 bg-white bg-opacity-20 rounded-xl">
            <h3 className="font-bold text-lg mb-2 text-black">{trip.title}</h3>
            <p className="text-shadow-black-200 text-sm">🗓️ {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'N/A'} - {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'N/A'}</p>
            <p className="text-gray-200 text-sm">📍 {trip.destinationCountry || 'N/A'}</p>
            {Array.isArray(trip.goals) && trip.goals.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-100 mb-2">Goals:</h4>
                <ul className="space-y-2">
                  {trip.goals.map(goal => (
                    <li key={goal.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={goal.done}
                        onChange={() => handleUpdateGoal(trip.id, goal.id, goal.done)}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                      />
                      <span className={`flex-grow ${goal.done ? 'line-through text-gray-400' : 'text-white'}`}>{goal.title}</span>
                      <button
                        onClick={() => handleDeleteGoal(trip.id, goal.id)}
                        className="text-red-400 hover:text-red-500 transition-colors duration-200"
                        title="Delete Goal"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.328a.75.75 0 000-1.236l-3.328-3.328A.75.75 0 0013.52 2H10.48a.75.75 0 00-.53.22L6.22 5.093a.75.75 0 000 1.236L9.54 9.658A.75.75 0 0010.48 9H13.52a.75.75 0 00.53.22L14.74 9z" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <form onSubmit={handleAddGoal} className="mt-4 flex space-x-2">
              <input
                type="text"
                value={trip.id === newGoal.tripId ? newGoal.title : ''}
                onChange={(e) => setNewGoal({ tripId: trip.id, title: e.target.value })}
                placeholder="Add a new goal..."
                className="flex-grow p-2 bg-white bg-opacity-20 rounded-md text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors duration-200"
                disabled={!newGoal.title || loading}
              >
                Add
              </button>
            </form>
          </div>
        ))
      ) : (
        <p className="text-gray-800 text-center">No trips found. Start your journey! 🗺️</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-center bg-cover flex items-center justify-center " 
          style={{ backgroundImage: "url('/assets/history.jpg')" }}
          >
      <div className="w-full max-w-4xl p-8 rounded-3xl shadow-2xl bg-gray    bg-opacity-10 border border-white border-opacity-30">
        
        {/* User Info & Tabs */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-black text-center drop-shadow-lg">Travel History ✈️</h1>
          {userId && (
            <div className="mt-4 p-2 bg-grey  bg-opacity-10 rounded-xl text-white text-sm md:text-base font-medium">
              User ID: <span className="font-bold">{userId}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8 bg-grey bg-opacity-10 p-1 rounded-full space-x-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-200 hover:bg-white hover:bg-opacity-20'}`}
          >
            My Trips
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${activeTab === 'badges' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-200 hover:bg-white hover:bg-opacity-20'}`}
          >
            My Badges
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white  shadow-lg' : 'text-gray-600 hover:bg-white hover:bg-opacity-20'}`}
          >
            Leaderboard
          </button>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center p-8">
            <p className="text-white text-lg animate-pulse">Loading data... ⏳</p>
          </div>
        )}
        {error && (
          <div className="text-center p-8">
            <p className="text-red-300 font-bold">{error}</p>
          </div>
        )}

        {/* Content based on Active Tab */}
        {!loading && !error && (
          <div>
            {activeTab === 'history' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Completed Trips ✅</h2>
                  {renderTrips(trips?.completed)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Ongoing Trips 🚶</h2>
                  {renderTrips(trips?.ongoing)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Planned Trips 📝</h2>
                  {renderTrips(trips?.planned)}
                </div>
              </div>
            )}

            {activeTab === 'badges' && (
              <div className="p-4 bg-white bg-opacity-20 rounded-xl">
                <h2 className="text-2xl font-bold text-gray-600  mb-4">My Badges ✨</h2>
                {badges ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white bg-opacity-20 rounded-lg">
                      <h3 className="font-semibold text-white">Countries Visited: {badges.countriesVisited}</h3>
                      <p className="text-gray-200 text-lg">{badges.badges.countryBadge}</p>
                    </div>
                    <div className="p-4 bg-white bg-opacity-20 rounded-lg">
                      <h3 className="font-semibold text-white">Blogs Posted: {badges.blogsPosted}</h3>
                      <p className="text-gray-200 text-lg">{badges.badges.blogBadge}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">No badge information available.</p>
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="p-4 bg-white bg-opacity-20 rounded-xl">
                <h2 className="text-2xl font-bold text-white mb-4">Leaderboard 🏆</h2>
                {leaderboard ? (
                  <table className="w-full text-left table-auto border-collapse">
                    <thead>
                      <tr className="bg-white bg-opacity-10 text-white">
                        <th className="p-3 rounded-tl-lg">Rank</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Countries</th>
                        <th className="p-3">Blogs</th>
                        <th className="p-3 rounded-tr-lg">Badges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((user, index) => (
                        <tr key={user.uid} className="border-b border-white border-opacity-20 last:border-b-0">
                          <td className="p-3 text-white font-bold">{index + 1}.</td>
                          <td className="p-3 text-gray-200">{user.displayName}</td>
                          <td className="p-3 text-gray-200">{user.countriesVisited}</td>
                          <td className="p-3 text-gray-200">{user.blogsPosted}</td>
                          <td className="p-3 text-gray-200">{user.badges.countryBadge} / {user.badges.blogBadge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-300">No leaderboard data available.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
