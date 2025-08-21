'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth,db } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'; // Import signOut for logout
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import NavigationBar from '@/components/NavigationBar';


export default function HomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('Guest'); // Default to Guest
  const [loadingAuth, setLoadingAuth] = useState(true); // Track initial auth loading

  useEffect(() => {
    if (!auth || !db) {
      console.warn("Firebase Auth or Firestore not initialized.");
      setLoadingAuth(false);
      return;
    }

    // Listener for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // User is signed in, fetch their profile data from Firestore
        try {
          const userDocRef = doc(db, 'userProfiles', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setUsername(userDocSnap.data().username || 'Traveler'); // Use username from Firestore, fallback
          } else {
            console.log("No user profile found in Firestore for:", user.uid);
            setUsername('New User'); // Fallback if profile not yet created (e.g., social login without profile data)
          }
        } catch (fetchError) {
          console.error("Error fetching user profile:", fetchError);
          setUsername('Error User'); // Indicate an error during fetch
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setUsername('Guest');
      }
      setLoadingAuth(false); // Auth loading complete
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array means this runs once on mount

  // Handle user logout
  const handleLogout = async () => {
    setLoadingAuth(true); // Indicate loading while logging out
    try {
      await signOut(auth);
      // State will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Error signing out: " + error.message); // Use alert for simplicity, consider custom modal in production
    } finally {
      setLoadingAuth(false);
    }
  };
  // Render the home page
  return (
    <div className="min-h-screen flex flex-col font-inter overflow-x-hidden bg-slate-100">
      {/* Background Image for the top 80% of the viewport, now FIXED */}
      <div
        className="fixed inset-x-0 top-0 h-[80vh] bg-cover bg-center" // Changed to fixed position
        style={{
          backgroundImage: "url('/assets/Homepage.jpg')", // Placeholder image
          filter: "blur(2px)", // Re-add blur if desired, removed as per previous update
          transform: "scale(1.05)" // Slightly scale to avoid blurry edges
        }}
      ></div>

      {/* Overlay to darken and make content readable over the top background, now FIXED */}
      <div className="fixed inset-x-0 top-0 h-[80vh] bg-black opacity-5 "></div>
              {/* Render the NavigationBar component */}
      <NavigationBar />
      

      {/* Middle Section (Hero) - Content that sits on top of the background image */}
      {/* Increased minHeight to ensure features section starts after the 80vh fixed background */}
      <main className="relative z-10 flex-grow flex items-center justify-center text-center p-8"
        style={{ minHeight: '70vh' }} // Ensure content area pushes down past the fixed background
      >
        {/* Hero Content - relative positioning and higher z-index to be on top */}
        <div className="relative z-20 bg-opacity-20 backdrop-blur-lg rounded-xl p-8 shadow-2xl max-w-4xl transform transition-all duration-300 ease-in-out hover:scale-[1.02]">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-black mb-4 leading-tight">
            Plan | Connect | Travel
          </h1>
          <p className="text-md sm:text-xl text-slate-600 mb-8">
            JourneyScribe is your ultimate travel companion, helping you discover, plan, and share your adventures seamlessly. From personalized itineraries to real-time bookings, your perfect trip starts here.
          </p>
          {!loadingAuth && !currentUser && (
          <a href="/auth/signup" className="inline-block px-8 py-4 rounded-full bg-blue-500 text-white text-lg font-semibold shadow-lg hover:bg-cyan-600 transition-colors duration-300 ease-in-out">
            Start Your Journey Today!
          </a>)}
          {currentUser && (
          <span className="text-black font-semibold text-shadow-lg text-2xl px-3 py-2 rounded-lg ">Hello, {username}!</span>
          )}
          </div>
      </main>

      {/* Scrollable Features Section - Now on a plain slate background */}
      <section className="relative z-10 w-full py-16"
        style={{
          background: 'linear-gradient(to right, #B7FFFA, #cbd5e1)' // A subtle blue-gray gradient
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-5xl sm:text-5xl font-bold text-center text-slate-800 mt-5 mb-20">Explore Our Powerful Features</h2>
          {/* Feature 5: Trip Management & On-the-Go Essentials */}
          <div className="rounded-xl border-green-500 border-l-2 border-t-2 p-8 mb-12 flex flex-col md:flex-row items-center gap-8 min-h-[50vh] md:min-h-[60vh]">
            <div className="md:w-1/2 text-center md:text-center">
              <h3 className="text-2xl sm:text-4xl font-bold text-emerald-600 mb-10">Trip Management & Essentials 💼</h3>
              <p className="text-base sm:text-2xl text-slate-700 mb-10">
                Track your trip history, set goals, and compete with friends on leaderboards. Store tickets securely offline with advanced encryption and jot down notes. Use the in-app currency and local time converter, and get suggestions for restaurants and activities based on your current location.
              </p>
              <div className="flex justify-center md:justify-start gap-4">
                <a href="#" className="px-6 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors">My Trips</a>
                <a href="#" className="px-6 py-3 rounded-lg bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors">Travel Tools</a>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center">
              <div className="w-full max-lg h-48 md:h-100 rounded-lg flex items-center justify-center overflow-hidden">
                 <img
                   src="/assets/essentials.svg"
                   alt="Trip Essentials"
                   className="w-full h-full object-contain p-4"
                   onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x400/64748b/ffffff?text=Image+Error"; }}
                 />
              </div>
            </div>
          </div>

          {/* Feature 2: Smart Trip Planning */}
          <div className="rounded-xl border-pink-500 border-r-1 border-t-1 p-8 mb-12 flex flex-col md:flex-row-reverse items-center gap-8 min-h-[60vh] md:min-h-[60vh]">
            <div className="md:w-1/2 text-center md:text-right">
              <h3 className="text-3xl sm:text-4xl font-bold text-purple-600 mb-10 text-center">Smart Trip Planning </h3>
              <p className="text-base sm:text-2xl text-slate-500 mb-10">
                Discover destinations with personalized attraction views, powered by Google Maps. Build interactive itineraries, budget effectively, and get real-time weather updates with packing suggestions. Share plans with friends for collaborative editing.
              </p>
              <div className="flex justify-center md:justify-center gap-4">
                <a href="#" className="px-6 py-3 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 transition-colors">Find Destinations</a>
                <a href="#" className="px-6 py-3 rounded-lg bg-pink-500 text-white font-semibold hover:bg-pink-600 transition-colors">Build Itinerary</a>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center">
              <div className="w-full max-w-lg h-120 md:h-120 rounded-lg flex items-center justify-center overflow-hidden">
                 <img
                   src="/assets/trip-planning.svg"
                   alt="Trip Planning"
                   className="w-full h-full object-contain p-4"
                   onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x400/64748b/ffffff?text=Image+Error"; }}
                 />
              </div>
            </div>
          </div>

          {/* Feature 3: Real-Time Bookings */}
          <div className="rounded-xl border-sky-500 border-l-1 border-t-1 p-8 mb-12 flex flex-col md:flex-row items-center gap-8 min-h-[50vh] md:min-h-[60vh]">
            <div className="md:w-1/2 text-center md:text-left">
              <h3 className="text-2xl sm:text-4xl font-bold text-indigo-600 mb-10 text-center">Real-Time Bookings 🏨</h3>
              <p className="text-base sm:text-2xl text-slate-500 mb-10">
                Access near real-time flight options from Expedia and GoZayaan, with advanced sorting. Find and book your ideal hotel stay, comparing prices and amenities to ensure the best fit for your journey.
              </p>
              <div className="flex justify-center md:justify-center gap-4">
                <a href="#" className="px-6 py-3 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors">Find Flights</a>
                <a href="#" className="px-6 py-3 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors">Book Hotels</a>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center">
              <div className="w-full max-w-lg h-100 md:h-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/booking.svg"
                  alt="Booking"
                  className="w-full h-full object-contain p-4"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x400/64748b/ffffff?text=Image+Error"; }}
                />
              </div>
            </div>
          </div>

          {/* Feature 4: Connect & Share */}
          <div className="rounded-xl border-orange-500 border-r-2 border-t-2 p-8 mb-12 flex flex-col md:flex-row-reverse items-center gap-8 min-h-[50vh] md:min-h-[60vh]">
            <div className="md:w-1/2 text-center md:text-right">
              <h3 className="text-2xl sm:text-4xl font-bold text-orange-600 mb-10">Connect & Share </h3>
              <p className="text-base sm:text-2xl text-slate-500 mb-10">
                Share your travel stories and experiences on your personal blog. Engage with other travelers through comments and in-app chat, filtered by locations to find like-minded explorers.
              </p>
              <div className="flex justify-center md:justify-center gap-4">
                <a href="#" className="px-6 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors">Start Blogging</a>
                <a href="#" className="px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">Join Chats</a>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center">
              <div className="w-full max-w-lg h-48 md:h-100 rounded-lg flex items-center justify-center overflow-hidden">
                 <img
                   src="/assets/connection.svg"
                   alt="Connection and Chat"
                   className="w-full h-full object-contain p-4"
                   onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x400/64748b/ffffff?text=Image+Error"; }}
                 />
              </div>
            </div>
          </div>

          {/* Feature 1: User Management & Personalization */}
          <div className=" rounded-xl border-blue-500 border-l-1 border-t-1 p-8 mb-12 flex flex-col md:flex-row items-center gap-40 min-h-[60vh] md:min-h-[60vh]">
            <div className="md:w-1/2 text-center md:text-left">
              <h3 className="text-4xl sm:text-5xl font-bold text-blue-600 mb-10 text-center">User Management and Personalization </h3>
              <p className="text-base sm:text-2xl text-slate-500 mb-10">
                Securely create and manage your account with email/password or social logins. View and edit your profile, set travel preferences, and receive smart notifications tailored just for you. Admins get powerful tools for user and content management.
              </p>
              <div className="flex justify-center md:justify-center gap-4">
                <a href="#" className="px-6 py-3 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors">Manage Profile</a>
                <a href="#" className="px-6 py-3 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors">My Notifications</a>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center">
              <div className="w-full max-w-lg h-70 md:h-100 rounded-lg flex items-center justify-center border border-blue-200 overflow-hidden">
                <img
                  src="/assets/user-management.svg"
                  alt="User Profile Management"
                  className="w-full h-full object-contain p-4"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x400/64748b/ffffff?text=Image+Error"; }}
                />
              </div>
            </div>
          </div>


        </div>
      </section>

      {/* Simple Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-slate-600 bg-white bg-opacity-80 backdrop-blur-sm mt-auto">
        &copy; {new Date().getFullYear()} JourneyScribe. All rights reserved.
      </footer>
    </div>
  );
}
