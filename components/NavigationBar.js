import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebaseClient'; // Your specified import path
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link'; // Import Next.js Link component

export default function NavigationBar() {
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false); // State for the new booking dropdown
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false); // Loading for user data fetch
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true); // Loading for initial Firebase auth check

    const userDropdownRef = useRef(null);
    const bookingDropdownRef = useRef(null); // Ref for the new booking dropdown

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // --- Firebase Authentication State Listener ---
    useEffect(() => {
        if (!auth || !db) {
            console.warn("Firebase Auth or Firestore not initialized.");
            setIsAuthReady(true);
            setLoadingAuth(false);
            return;
        }

        setLoadingAuth(true);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setIsUserAuthenticated(true);
            } else {
                setUserId(null);
                setIsUserAuthenticated(false);
                setUserData(null);
                setError(null);
                setLoading(false);
            }
            setIsAuthReady(true);
            setLoadingAuth(false);
        });

        return () => unsubscribe();
    }, [auth, db]);

    // --- Fetch user details if authenticated ---
    useEffect(() => {
        if (isAuthReady && isUserAuthenticated && db && userId) {
            fetchUserDetails();
        } else if (isAuthReady && !isUserAuthenticated) {
            setUserData(null);
            setError(null);
            setLoading(false);
        }
    }, [isAuthReady, isUserAuthenticated, db, userId]);

    const fetchUserDetails = async () => {
        if (!db || !userId || !isAuthReady || !isUserAuthenticated) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const userProfileRef = doc(db, "userProfiles", userId);
            const docSnap = await getDoc(userProfileRef);
            if (docSnap.exists()) {
                setUserData(docSnap.data());
            } else {
                setUserData({ message: "No user profile found." });
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
            setError("Failed to load user data.");
            setUserData(null);
        } finally {
            setLoading(false);
        }
    };

    // --- Handle User Logout ---
    const handleLogout = async () => {
        setLoadingAuth(true);
        try {
            if (auth) {
                await signOut(auth);
            }
        } catch (logoutError) {
            console.error("Error signing out:", logoutError);
            setError("Error signing out: " + logoutError.message);
        }
    };
    
    // --- Close dropdowns when clicking outside ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
            if (bookingDropdownRef.current && !bookingDropdownRef.current.contains(event.target)) {
                setShowBookingDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    // Determine the display name and picture
    const userNameDisplay = (userData && userData.fullName) ? userData.fullName : "Guest";
    const userPictureDisplay = (userData && userData.profilePicture) ? userData.profilePicture : "https://placehold.co/40x40/FF5733/FFFFFF?text=JD"; // Fallback

    return (
        <>
            <nav className="relative z-20 w-full bg-white/[0.1] bg-opacity-80 backdrop-blur-sm shadow-md">
                <div className="container mx-auto flex items-center justify-between" style={{ color: 'var(--nav-text-color)' }}>
                    <Link href="/" className="flex items-center">
                        <img src="/assets/LOGO.png" alt="JourneyScribe Logo" className="h-22 p-2" />
                        <img src="/assets/NAME.png" alt="JourneyScribe Name" className="h-22 p-2" />
                    </Link>

                    <div className="flex items-center space-x-4 md:space-x-6">
                        <div className="hidden md:flex items-center space-x-2">
                            <Link href="/notifications" className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Notifications</Link>
                            <Link href="/Profilepage" className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Profile</Link>
                            
                            {/* --- NEW BOOKING DROPDOWN --- */}
                            <div className="relative" ref={bookingDropdownRef}>
                                <button 
                                    onClick={() => setShowBookingDropdown(prev => !prev)}
                                    className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg flex items-center"
                                >
                                    Bookings
                                    <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${showBookingDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showBookingDropdown && (
                                    <div className="absolute top-full mt-4 w-48 bg-white/[0.4] backdrop-blur-lg rounded-lg shadow-xl border border-white/20 z-30">
                                        <div className="py-2">
                                            <Link href="/flight/search" className="block px-4 py-2 text-slate-900 hover:bg-blue-500 hover:text-white transition-colors font-semibold">Flights</Link>
                                            <Link href="/hotel/search" className="block px-4 py-2 text-slate-900 hover:bg-blue-500 hover:text-white transition-colors font-semibold">Hotels</Link>
                                            <Link href="/bookings" className="block px-4 py-2 text-slate-900 hover:bg-blue-500 hover:text-white transition-colors font-semibold">Confirmations</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Link href="/blog" className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Blogs</Link>
                            <Link href="/chat" className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Chat</Link>
                        </div>

                        {/* Conditional User information / Sign In button */}
                        {loadingAuth ? (
                            <div className="px-4 py-2 text-black ">Loading...</div>
                        ) : isUserAuthenticated ? (
                            <div className="relative" ref={userDropdownRef}>
                                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowUserDropdown(prev => !prev)}>
                                    <span className="text-black text-sm md:text-base font-semibold hidden sm:block">{userNameDisplay}</span>
                                    <img
                                        src={userPictureDisplay}
                                        alt="User Profile"
                                        className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-md object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/CCCCCC/666666?text=User"; }}
                                    />
                                </div>
                                {showUserDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-4 border border-blue-500 z-20">
                                        <div className="p-4">
                                            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100 text-center">User Details</h3>
                                            {loading && <p className="text-center text-blue-500">Loading...</p>}
                                            {error && <p className="text-center text-red-500">{error}</p>}
                                            {!loading && !error && userData && (
                                                <div className="space-y-2 text-sm">
                                                    <div className="text-center mb-3">
                                                        <img
                                                            src={userData.profilePicture || "https://placehold.co/80x80/CCCCCC/666666?text=User"}
                                                            alt="User Profile"
                                                            className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-blue-400 shadow"
                                                        />
                                                        <p className="mt-2 text-base font-semibold text-gray-800 dark:text-gray-200">{userData.fullName || 'N/A'}</p>
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Email:</span> {userData.email || 'N/A'}</p>
                                                    <p className="text-gray-700 dark:text-gray-300 break-words"><span className="font-medium">User ID:</span> <span className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded-md">{userId || 'N/A'}</span></p>
                                                    {userData.message && (<p className="text-center text-gray-500 dark:text-gray-400 italic mt-4">{userData.message}</p>)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                onClick={handleLogout}
                                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-md hover:bg-red-700 transition-colors"
                                                disabled={loadingAuth}
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/auth/login" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-colors">Sign In</Link>
                        )}

                        <button className="md:hidden text-gray-700 dark:text-gray-200 focus:outline-none">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>
        </>
    );
}
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebaseClient'; // Your specified import path
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link'; // Import Next.js Link component
import NotificationsDropdown from './NotificationsDropdown'; // 1. Import the new component

export default function NavigationBar() {
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
            setLoadingAuth(false);
            return;
        }

        setLoadingAuth(true);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setIsUserAuthenticated(true);
            } else {
                setUserId(null);
                setIsUserAuthenticated(false);
                setUserData(null);
                setError(null);
                setLoading(false);
            }
            setIsAuthReady(true);
            setLoadingAuth(false);
        });

        return () => unsubscribe();
    }, [auth, db]);

    // --- Fetch user details if authenticated and userId becomes available ---
    useEffect(() => {
        if (isAuthReady && isUserAuthenticated && db && userId) {
            fetchUserDetails();
        } else if (isAuthReady && !isUserAuthenticated) {
            setUserData(null);
            setError(null);
            setLoading(false);
        }
    }, [isAuthReady, isUserAuthenticated, db, userId]);

    const fetchUserDetails = async () => {
        if (!db || !userId || !isAuthReady || !isUserAuthenticated) {
            console.warn("Firestore (db) not ready, userId not available, or user not authenticated for data fetch. Skipping fetch.");
            setUserData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
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
            setLoading(false);
        }
    };

    // --- Handle User Logout ---
    const handleLogout = async () => {
        setLoadingAuth(true); 
        try {
            if (auth) {
                await signOut(auth);
            } else {
                console.error("Firebase Auth instance not available for sign out.");
            }
        } catch (logoutError) {
            console.error("Error signing out:", logoutError);
            setError("Error signing out: " + logoutError.message);
        }
    };

    // --- Handle click on profile area ---
    const handleUserAreaClick = () => {
        if (loadingAuth) return;

        if (isUserAuthenticated) {
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

    const userNameDisplay = (userData && userData.fullName) ? userData.fullName : "Guest";
    const userPictureDisplay = (userData && userData.profilePicture) ? userData.profilePicture : "https://placehold.co/40x40/FF5733/FFFFFF?text=JD";

    return (
        <nav className="relative z-20 w-full bg-white/[0.1] bg-opacity-80 backdrop-blur-sm shadow-md">
            <div className="container mx-auto flex items-center justify-between" style={{ color: 'var(--nav-text-color)' }}>
                <Link href="/">
                    <img src="/assets/JourneyScribe.png" alt="JourneyScribe" className="h-22 p-2" />
                </Link>

                <div className="flex items-center space-x-4 md:space-x-6">
                    <div className="hidden md:flex items-center space-x-4">
                        {/* 2. REMOVED the old Notifications link */}
                        <Link href="/Profilepage" className="text-gray-900 hover:text-blue-600 font-medium px-3 py-2 rounded-md transition duration-300">Profile</Link>
                        <Link href="/flight" className="text-gray-900 hover:text-blue-600 font-medium px-3 py-2 rounded-md transition duration-300">Flight</Link>
                        <Link href="/hotel/search" className="text-gray-900 hover:text-blue-600 font-medium px-3 py-2 rounded-md transition duration-300">Hotel</Link>
                    </div>
                    <NotificationsDropdown /> {/* 3. ADD the new component here */}

                    {loadingAuth ? (
                        <div className="px-4 py-2 text-gray-500">Loading...</div>
                    ) : isUserAuthenticated ? (
                        // User is authenticated, show profile area and notifications
                        <div className="flex items-center space-x-4">
                            <NotificationsDropdown /> {/* 3. ADD the new component here */}
                            <div className="relative flex items-center space-x-3 cursor-pointer" onClick={handleUserAreaClick} ref={dropdownRef}>
                                <span className="text-gray-700 text-sm md:text-base font-semibold hidden sm:block">
                                    {userNameDisplay}
                                </span>
                                <img
                                    src={userPictureDisplay}
                                    alt="User Profile"
                                    className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-md object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/CCCCCC/666666?text=User"; }}
                                />

                                {showDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl py-4 border border-blue-500 z-20">
                                        <div className="p-4">
                                            <h3 className="text-lg font-bold mb-3 text-gray-900 text-center">User Details</h3>
                                            {loading && <p className="text-center text-blue-500">Loading...</p>}
                                            {error && <p className="text-center text-red-500">{error}</p>}
                                            {!loading && !error && userData && (
                                                <div className="space-y-2 text-sm">
                                                    <div className="text-center mb-3">
                                                        <img
                                                            src={userData.profilePicture || "https://placehold.co/80x80/CCCCCC/666666?text=User"}
                                                            alt="User Profile"
                                                            className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-blue-400 shadow"
                                                        />
                                                        <p className="mt-2 text-base font-semibold text-gray-800">{userData.fullName || 'N/A'}</p>
                                                    </div>
                                                    <p className="text-gray-700"><span className="font-medium">Email:</span> {userData.email || 'N/A'}</p>
                                                    <p className="text-gray-700 break-words"><span className="font-medium">User ID:</span> <span className="text-xs bg-gray-200 p-1 rounded-md">{userId || 'N/A'}</span></p>
                                                    {userData.message && (
                                                        <p className="text-center text-gray-500 italic mt-4">{userData.message}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center border-t border-gray-200 pt-4 mt-2">
                                            <button
                                                onClick={handleLogout}
                                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-md hover:bg-red-700 transition-colors"
                                                disabled={loadingAuth}
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // User is not authenticated, show Sign In button
                        <Link href="/auth/login" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-colors">Sign In</Link>
                    )}

                    <button className="md:hidden text-gray-700 focus:outline-none">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </nav>
    );
}