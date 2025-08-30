'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import NotificationsDropdown from './NotificationsDropdown';
import { useRouter } from 'next/navigation';

export default function NavigationBarLight() {
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false);
    const [showTripsDropdown, setShowTripsDropdown] = useState(false);
    const [showBlogsDropdown, setShowBlogsDropdown] = useState(false);
    const [showPlanningDropdown, setShowPlanningDropdown] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const userDropdownRef = useRef(null);
    const bookingDropdownRef = useRef(null);
    const tripsDropdownRef = useRef(null);
    const blogsDropdownRef = useRef(null);
    const planningDropdownRef = useRef(null);
    const router = useRouter();
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
    }, []);

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
            if (tripsDropdownRef.current && !tripsDropdownRef.current.contains(event.target)) {
                setShowTripsDropdown(false);
            }
            if (blogsDropdownRef.current && !blogsDropdownRef.current.contains(event.target)) {
                setShowBlogsDropdown(false);
            }
            if (planningDropdownRef.current && !planningDropdownRef.current.contains(event.target)) {
                setShowPlanningDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const userNameDisplay = (userData && userData.fullName) ? userData.fullName : "Guest";
    const userPictureDisplay = (userData && userData.profilePicture) ? userData.profilePicture : "https://placehold.co/40x40/FF5733/FFFFFF?text=JD"; // Fallback

    return (
        <>
            <nav className="relative z-20 w-full bg-white/[0.1] bg-opacity-80 backdrop-blur-sm shadow-md">
                <div className="container mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <img src="/assets/LOGO.png" alt="JourneyScribe Logo" className="h-22 p-2" />
                        <img src="/assets/NAME.png" alt="JourneyScribe Name" className="h-22 p-2" />
                    </Link>

                    <div className="flex items-center space-x-4 md:space-x-6">
                        <div className="hidden md:flex items-center space-x-2">
                            
                            {/* --- BOOKING DROPDOWN --- */}
                            <div className="relative" ref={bookingDropdownRef}>
                                <button 
                                    onClick={() => setShowBookingDropdown(prev => !prev)}
                                    className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg flex items-center"
                                >
                                    Bookings
                                    <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${showBookingDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showBookingDropdown && (
                                    <div className="absolute top-full mt-4 w-48 bg-white backdrop-blur-xl rounded-lg shadow-xl border border-white/20 z-30">
                                        <div className="py-2">
                                            <Link href="/flight/search" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Flights</Link>
                                            <Link href="/hotel/search" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Hotels</Link>
                                            <Link href="/bookings" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Confirmations</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- TRIPS DROPDOWN --- */}
                            <div className="relative" ref={tripsDropdownRef}>
                                <button 
                                    onClick={() => setShowTripsDropdown(prev => !prev)}
                                    className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg flex items-center"
                                >
                                    Trips
                                    <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${showTripsDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showTripsDropdown && (
                                    <div className="absolute top-full mt-4 w-48 bg-white backdrop-blur-xl rounded-lg shadow-xl border border-white/20 z-30">
                                        <div className="py-2">
                                            <Link href="/travel-tools" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Travel tools</Link> 
                                            <Link href="/trip-documents" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Trip Documents</Link>
                                            <Link href="/trips" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Trips</Link> 
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- BLOGS DROPDOWN --- */}
                            <div className="relative" ref={blogsDropdownRef}>
                                <button 
                                    onClick={() => setShowBlogsDropdown(prev => !prev)}
                                    className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg flex items-center"
                                >
                                    Blogs
                                    <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${showBlogsDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showBlogsDropdown && (
                                    <div className="absolute top-full mt-4 w-48 bg-white backdrop-blur-xl rounded-lg shadow-xl border border-white/20 z-30">
                                        <div className="py-2">
                                            <Link href="/blog" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Blogs</Link>
                                            <Link href="/feedback" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Feedback</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- PLANNING DROPDOWN --- */}
                            <div className="relative" ref={planningDropdownRef}>
                                <button 
                                    onClick={() => setShowPlanningDropdown(prev => !prev)}
                                    className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg flex items-center"
                                >
                                    Planning
                                    <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${showPlanningDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showPlanningDropdown && (
                                    <div className="absolute top-full mt-4 w-48 bg-white backdrop-blur-xl rounded-lg shadow-xl border border-white/20 z-30">
                                        <div className="py-2">
                                            <Link href="/packing" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Packing</Link>
                                            <Link href="/itinerary" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Itinerary</Link>
                                            <Link href="/activities" className="font-semibold block px-4 py-2 text-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Activities</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Link href="/chat" className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Chat</Link>
                            <Link href="/expense" className="text-slate-900 font-semibold px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white hover:shadow-lg">Expenses</Link>
                            <NotificationsDropdown />
                        </div>

                        {/* Conditional User information / Sign In button */}
                        {loadingAuth ? (
                            <div className="px-4 py-2 text-gray-500">Loading...</div>
                        ) : isUserAuthenticated ? (
                            <div className="relative" ref={userDropdownRef}>
                                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowUserDropdown(prev => !prev)}>
                                    <span className="text-gray-800 text-sm md:text-base font-semibold hidden sm:block">{userNameDisplay}</span>
                                    <img
                                        src={userPictureDisplay}
                                        alt="User Profile"
                                        className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-md object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/CCCCCC/666666?text=User"; }}
                                    />
                                </div>
                                {showUserDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                                        {loading && <p className="p-4 text-center text-blue-500">Loading details...</p>}
                                        {error && <p className="p-4 text-center text-red-500">{error}</p>}
                                        
                                        {!loading && !error && userData && (
                                            <>
                                                <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                                                    <img
                                                        src={userData.profilePicture || "https://placehold.co/80x80/CCCCCC/666666?text=User"}
                                                        alt="User Profile"
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-gray-800 truncate">{userData.fullName || 'N/A'}</p>
                                                        <p className="text-xs text-gray-500 truncate">{userData.email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="py-2">
                                                    <MenuItem icon={<UserIcon />} onClick={() => router.push('/Profilepage')}>Profile</MenuItem>
                                                    <MenuItem icon={<BellIcon />} onClick={() => router.push('/notifications')}>Notifications</MenuItem>
                                                    <MenuItem icon={<TrophyIcon />} onClick={() => router.push('/achievements')}>Achievements</MenuItem>
                                                </div>
                                                <div className="border-t border-gray-200 py-2">
                                                    <MenuItem icon={<LogoutIcon />} onClick={handleLogout} disabled={loadingAuth} isDestructive>
                                                        Sign Out
                                                    </MenuItem>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
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
        </>
    );
}

// --- HELPER COMPONENT AND ICONS ---
const MenuItem = ({ icon, children, onClick, disabled, isDestructive = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left ${
            isDestructive 
                ? 'text-red-600' 
                : 'text-gray-700'
        } hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {icon}
        <span>{children}</span>
    </button>
);

// --- SVG Icons ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-5 0-7-3-7-7 0-4 2-7 7-7 4 0 7 3 7 7 0 4-2 7-7 7zM9 19c0 2 1 4 3 4s3-2 3-4M5 12h8m-4-4v8" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;