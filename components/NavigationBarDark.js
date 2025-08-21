'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebaseClient'; // Your specified import path
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link'; // Import Next.js Link component

export default function NavigationBarDark() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false); // Loading for user data fetch
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true); // Loading for initial Firebase auth check

  const dropdownRef = useRef(null);

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // --- Firebase Authentication State Listener ---
  useEffect(() => {
    if (!auth || !db) {
      console.warn("Firebase Auth or Firestore not initialized. Ensure '@/lib/firebaseClient' correctly initializes and exports 'auth' and 'db'.");
      setIsAuthReady(true);
      setLoadingAuth(false); // Auth not available, so initial loading is done
      return;
    }

    setLoadingAuth(true); // Start loading state for auth check

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setIsUserAuthenticated(true);
      } else {
        setUserId(null);
        setIsUserAuthenticated(false);
        setUserData(null); // Clear user data on logout
        setError(null);
        setLoading(false); // Ensure data loading is off
      }
      setIsAuthReady(true); // Mark Firebase auth ready for subsequent operations
      setLoadingAuth(false); // Auth state determination complete
    });

    return () => unsubscribe(); // Cleanup auth listener on component unmount
  }, [auth, db]); // Depend on 'auth' and 'db' to set up listener

  // --- Fetch user details if authenticated and userId becomes available ---
  useEffect(() => {
    // Only fetch data if auth is ready, user is authenticated, and userId and db are available
    if (isAuthReady && isUserAuthenticated && db && userId) {
      fetchUserDetails();
    } else if (isAuthReady && !isUserAuthenticated) {
      // If auth is ready but no user is authenticated, ensure data states are cleared
      setUserData(null);
      setError(null);
      setLoading(false);
    }
  }, [isAuthReady, isUserAuthenticated, db, userId]); // Re-run when auth state or userId changes

  const fetchUserDetails = async () => {
    if (!db || !userId || !isAuthReady || !isUserAuthenticated) {
      console.warn("Firestore (db) not ready, userId not available, or user not authenticated for data fetch. Skipping fetch.");
      setUserData(null);
      setLoading(false);
      return;
    }

    setLoading(true); // Start loading for user data
    setError(null);
    try {
      // Path for user-specific profile data: /artifacts/{appId}/users/{userId}/userProfiles/{userId}
      const userProfileRef = doc(db, "userProfiles", userId);
      const docSnap = await getDoc(userProfileRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData({ message: "No user profile found. Consider adding your details!" });
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to load user data. Please try again.");
      setUserData(null);
    } finally {
      setLoading(false); // End loading for user data
    }
  };

  // --- Handle User Logout ---
  const handleLogout = async () => {
    setLoadingAuth(true); // Indicate loading while logging out (disables button)
    try {
      if (auth) {
        await signOut(auth);
      } else {
        console.error("Firebase Auth instance not available for sign out.");
      }
    } catch (logoutError) {
      console.error("Error signing out:", logoutError);
      setError("Error signing out: " + logoutError.message);
    } finally {
      // This will be handled by the onAuthStateChanged listener
    }
  };

  // --- Handle click on profile area (or Sign In button) ---
  const handleUserAreaClick = () => {
    if (loadingAuth) return; // Prevent clicks if initial auth state is still loading

    if (!isUserAuthenticated) {
      // In a real Next.js app, you'd use router.push('/auth/login');
    } else {
      setShowDropdown(prev => !prev);
      if (!showDropdown && (!userData || error)) {
        fetchUserDetails();
      }
    }
  };

  // --- Close dropdown when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Determine the display name and picture
  const userNameDisplay = (userData && userData.fullName) ? userData.fullName : "Guest";
  const userPictureDisplay = (userData && userData.profilePicture) ? userData.profilePicture : "https://placehold.co/40x40/FF5733/FFFFFF?text=JD"; // Fallback

  return (
    <nav className="relative z-20 w-full bg-gray-900/[0.1] bg-opacity-80 backdrop-blur-sm shadow-md">
      <div className="container mx-auto flex items-center justify-between">

        <Link href="/" className="flex items-center">
          <img src="/assets/LOGO.png" alt="JourneyScribe" className="h-22 p-2 flex-row" />
          <img src="/assets/NAME.png" alt="JourneyScribe" className="h-22 p-2 flex-row" />
          </Link>


          {/* Right section: Navigation buttons and user info / Sign In */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* --- PRETTIER NAVIGATION LINKS --- */}
                    <div className="hidden md:flex items-center space-x-2">
                        <Link href="/notifications" className="text-slate-200 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Notifications</Link>
                        <Link href="/Profilepage" className="text-slate-200 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Profile</Link>
                        <Link href="/flight/search" className="text-slate-200 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Flight</Link>
                        <Link href="/hotel/search" className="text-slate-200 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Hotel</Link>
                        <Link href="/blog" className="text-slate-200 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Blogs</Link>
                    </div>


          {/* Conditional User information / Sign In button */}
          {loadingAuth ? (
            <div className="px-4 py-2 text-gray-400">Loading...</div>
          ) : isUserAuthenticated ? (
            // User is authenticated, show profile picture and name with dropdown
            <div className="relative flex items-center space-x-3 cursor-pointer" onClick={handleUserAreaClick} ref={dropdownRef}>
              <span className="text-gray-200 text-sm md:text-base font-semibold hidden sm:block">
                {userNameDisplay}
              </span>
              <img
                src={userPictureDisplay}
                alt="User Profile"
                className="w-10 h-10 rounded-full border-2 border-blue-400 shadow-md object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/CCCCCC/666666?text=User"; }}
              />

              {/* User Profile Dropdown */}
              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl py-4 border border-blue-700 z-20">
                  <div className="p-4">
                    <h3 className="text-lg font-bold mb-3 text-gray-100 text-center">User Details</h3>
                    {loading && <p className="text-center text-blue-400">Loading...</p>}
                    {error && <p className="text-center text-red-400">{error}</p>}
                    {!loading && !error && userData && (
                      <div className="space-y-2 text-sm">
                        <div className="text-center mb-3">
                          <img
                            src={userData.profilePicture || "https://placehold.co/80x80/CCCCCC/666666?text=User"}
                            alt="User Profile"
                            className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-blue-500 shadow"
                          />
                          <p className="mt-2 text-base font-semibold text-gray-100">{userData.fullName || 'N/A'}</p>
                        </div>
                        <p className="text-gray-300">
                          <span className="font-medium">Email:</span> {userData.email || 'N/A'}
                        </p>
                        <p className="text-gray-300 break-words">
                          <span className="font-medium">User ID:</span> <span className="text-xs bg-gray-700 p-1 rounded-md">{userId || 'N/A'}</span>
                        </p>
                        {userData.message && (
                          <p className="text-center text-gray-400 italic mt-4">{userData.message}</p>
                        )}
                      </div>
                    )}
                    {!loading && !error && !userData && (
                      <p className="text-center text-gray-400">No user data available.</p>
                    )}
                  </div>
                </div>
              )}
              <div className="text-center">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-red-700 text-white font-semibold shadow-md hover:bg-red-800 transition-colors"
                  disabled={loadingAuth}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            // User is not authenticated, show Sign In button
            <Link href="/auth/login" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold shadow-md hover:bg-blue-800 transition-colors">Sign In</Link>
          )}

          {/* Mobile menu button (Hamburger icon or similar) */}
          <button className="md:hidden text-gray-200 focus:outline-none">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
