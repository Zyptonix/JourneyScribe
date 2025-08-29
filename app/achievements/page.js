'use client';
import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebaseClient.js';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, orderBy, getDoc, setDoc } from 'firebase/firestore';
import NavigationBarDark from '@/components/NavigationBarDark'; // Assuming this path is correct

// --- Global variables ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Define badge identifiers with richer detail for better UI rendering
const BADGE_DEFINITIONS = {
    firstTripPlanned: { title: 'Trip Planner', emoji: '📝', description: 'You planned your first adventure!' },
    firstTripOngoing: { title: 'Explorer', emoji: '🚶', description: 'Your first journey is underway.' },
    firstTripCompleted: { title: 'Seasoned Traveler', emoji: '✅', description: 'Completed your first trip.' },
    firstBlogPosted: { title: 'Rookie Blogger', emoji: '✍️', description: 'Published your first blog post.' },
    globetrotter: { title: 'Globetrotter', emoji: '🌍', description: 'Visited 3+ unique locations.' },
};


// --- Main Component ---
export default function HistoryPage() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // Data states
    const [trips, setTrips] = useState({ completed: [], ongoing: [], planned: [] });
    const [userBadges, setUserBadges] = useState({}); // Stores earned badges as a map { badgeId: true }
    const [leaderboard, setLeaderboard] = useState([]);
    const [blogsCount, setBlogsCount] = useState(0); 
    const [uniqueLocationsVisited, setUniqueLocationsVisited] = useState(0); 

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('history');

    // --- Authentication ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else if (initialAuthToken) {
                try {
                    const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                    setUserId(userCredential.user.uid);
                } catch (e) {
                    console.error("Custom token sign-in failed, trying anonymous.", e);
                    await signInAnonymously(auth);
                }
            } else {
                await signInAnonymously(auth);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // --- Badge and Leaderboard Calculation & Update ---
    const updateBadgesAndProfile = async (currentUserId, allTrips, currentBlogsCount) => {
        if (!currentUserId) return;

        const userProfileRef = doc(db, 'userProfiles', currentUserId);
        const userProfileSnap = await getDoc(userProfileRef);
        const existingProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
        const existingBadges = existingProfileData.badges || {};

        let updatedBadges = { ...existingBadges };
        const completedTrips = allTrips.filter(trip => new Date(trip.endDate) < new Date());
        const newUniqueLocationsVisited = new Set(completedTrips.map(trip => trip.location)).size;

        // Badge Checks
        if (allTrips.some(trip => new Date(trip.startDate) > new Date()) && !existingBadges.firstTripPlanned) {
            updatedBadges.firstTripPlanned = true;
        }
        if (allTrips.some(trip => { const now = new Date(); return new Date(trip.startDate) <= now && new Date(trip.endDate) >= now; }) && !existingBadges.firstTripOngoing) {
            updatedBadges.firstTripOngoing = true;
        }
        if (completedTrips.length > 0 && !existingBadges.firstTripCompleted) {
            updatedBadges.firstTripCompleted = true;
        }
        if (currentBlogsCount > 0 && !existingBadges.firstBlogPosted) {
            updatedBadges.firstBlogPosted = true;
        }
        if (newUniqueLocationsVisited >= 3 && !existingBadges.globetrotter) {
            updatedBadges.globetrotter = true;
        }

        // Calculate score
        let newScore = (allTrips.length * 10) + (currentBlogsCount * 20) + (Object.keys(updatedBadges).length * 50);

        // Update user profile in Firestore
        await setDoc(userProfileRef, {
            badges: updatedBadges,
            countriesVisited: newUniqueLocationsVisited,
            blogsPosted: currentBlogsCount,
            score: newScore,
            displayName: auth.currentUser?.fullName || existingProfileData.fullName || 'Anonymous Traveler',
            profilePicture: auth.currentUser?.photoURL || existingProfileData.profilePicture || `https://api.dicebear.com/8.x/adventurer/svg?seed=${currentUserId}`, // Default avatar
        }, { merge: true });

        setUserBadges(updatedBadges);
        setUniqueLocationsVisited(newUniqueLocationsVisited);
    };

    // --- Data Fetching ---
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        setLoading(true);
        setError(null);

        // Fetch Blogs Count
        const blogsQuery = query(collection(db, 'blogs'), where("authorId", "==", userId));
        const unsubscribeBlogs = onSnapshot(blogsQuery, (snapshot) => {
            setBlogsCount(snapshot.size);
        }, (err) => {
            console.error("Error fetching blogs:", err);
            setError("Failed to load blog data.");
        });

        // Fetch Trips
        const tripsQuery = query(collection(db, `artifacts/${appId}/public/data/trips`), where("userId", "==", userId));
        const unsubscribeTrips = onSnapshot(tripsQuery, async (snapshot) => {
            try {
                const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Categorize trips
                const now = new Date();
                const categorizedTrips = { completed: [], ongoing: [], planned: [] };
                tripsData.forEach(trip => {
                    const startDate = new Date(trip.startDate);
                    const endDate = new Date(trip.endDate);
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;
                    
                    if (endDate < now) categorizedTrips.completed.push(trip);
                    else if (startDate <= now) categorizedTrips.ongoing.push(trip);
                    else categorizedTrips.planned.push(trip);
                });
                setTrips(categorizedTrips);
                
                // Update badges after trip data is fetched
                await updateBadgesAndProfile(userId, tripsData, blogsCount);
            } catch (err) {
                console.error("Error processing trips:", err);
                setError("Failed to process trip data.");
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error("Error fetching trips:", err);
            setError("Failed to load trip data.");
            setLoading(false);
        });

        // Fetch Leaderboard
        const leaderboardQuery = query(collection(db, 'userProfiles'), orderBy('score', 'desc'), orderBy('displayName', 'asc'));
        const unsubscribeLeaderboard = onSnapshot(leaderboardQuery, (snapshot) => {
            // **CHANGE:** Removed the filter to show all users, including those with a score of 0.
            const leaderboardData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeaderboard(leaderboardData);
        }, (err) => {
            console.error("Error fetching leaderboard:", err);
            setError("Failed to load leaderboard data.");
        });

        return () => {
            unsubscribeTrips();
            unsubscribeBlogs();
            unsubscribeLeaderboard();
        };
    }, [isAuthReady, userId, blogsCount]); // Re-run when blogsCount changes to update badges

    // --- UI Rendering ---
    const renderTrips = (tripList, status) => (
        <div className="space-y-6">
            {tripList && tripList.length > 0 ? (
                tripList.map(trip => (
                    <div key={trip.id} className="group relative p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/20 transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:scale-105">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-2xl mb-2 text-white">{trip.location}</h3>
                                <p className="flex items-center gap-2 text-white/70 text-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                                    {trip.startDate} to {trip.endDate}
                                </p>
                            </div>
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${status === 'ongoing' ? 'bg-green-500/20 text-green-300' : status === 'planned' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                {status}
                            </span>
                        </div>
                    </div>
                ))
            ) : <p className="text-white/60 text-center italic py-4">No trips in this category yet.</p>}
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-black/60 backdrop-blur-sm bg-center bg-cover bg-fixed" style={{ backgroundImage: "url('/assets/history.jpg')" }}>
            {/* This overlay provides the dark/blur effect over the background image */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" />
            <NavigationBarDark />
            <main className="w-full max-w-5xl mx-auto p-4 sm:p-8 text-white">
                <header className="text-center mb-12 pt-20">
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">Your Journey</h1>
                    <p className="mt-4 text-lg text-white/80">Review your trips, achievements, and ranking.</p>
                </header>

                <div className="flex justify-center mb-8 bg-black/30 backdrop-blur-xl p-2 rounded-full border border-white/20">
                    <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-full font-semibold transition-all ${activeTab === 'history' ? 'bg-blue-600 shadow-lg' : 'hover:bg-white/10'}`}>My Trips</button>
                    <button onClick={() => setActiveTab('badges')} className={`px-6 py-2 rounded-full font-semibold transition-all ${activeTab === 'badges' ? 'bg-blue-600 shadow-lg' : 'hover:bg-white/10'}`}>My Badges</button>
                    <button onClick={() => setActiveTab('leaderboard')} className={`px-6 py-2 rounded-full font-semibold transition-all ${activeTab === 'leaderboard' ? 'bg-blue-600 shadow-lg' : 'hover:bg-white/10'}`}>Leaderboard</button>
                </div>

                {loading && <div className="text-center p-8"><p className="text-lg animate-pulse">Loading your travel data...</p></div>}
                {error && <div className="text-center p-8 bg-red-500/10 rounded-lg border border-red-500/30"><p className="text-red-400 font-bold">{error}</p></div>}

                {!loading && !error && (
                    <div className="animate-fade-in">
                        {activeTab === 'history' && (
                            <div className="space-y-12">
                                <div><h2 className="text-3xl font-bold mb-4 border-b-2 border-green-500/50 pb-2 text-green-300">Ongoing Trips 🚀</h2>{renderTrips(trips.ongoing, 'ongoing')}</div>
                                <div><h2 className="text-3xl font-bold mb-4 border-b-2 border-yellow-500/50 pb-2 text-yellow-300">Planned Trips 🗺️</h2>{renderTrips(trips.planned, 'planned')}</div>
                                <div><h2 className="text-3xl font-bold mb-4 border-b-2 border-blue-500/50 pb-2 text-blue-300">Completed Trips ✨</h2>{renderTrips(trips.completed, 'completed')}</div>
                            </div>
                        )}
                        {activeTab === 'badges' && (
                            <div className="p-8 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20">
                                <h2 className="text-3xl font-bold mb-6">My Achievements ✨</h2>
                                {Object.keys(userBadges).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
                                        {Object.entries(BADGE_DEFINITIONS).map(([badgeId, { title, emoji, description }]) => {
                                            const earned = userBadges[badgeId];
                                            return (
                                                <div key={badgeId} className={`p-6 bg-white/5 rounded-xl border transition-all duration-300 ${earned ? 'border-yellow-400/50 shadow-lg shadow-yellow-500/10' : 'border-white/20 opacity-50'}`}>
                                                    <p className={`text-6xl mb-3 transition-transform duration-300 ${earned ? 'transform scale-110' : ''}`}>{emoji}</p>
                                                    <h3 className="font-bold text-xl text-white">{title}</h3>
                                                    <p className="text-white/60 text-sm mt-1">{description}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <p className="text-white/60 text-center">No badges earned yet. Start a trip or post a blog to begin!</p>}
                            </div>
                        )}
                        {activeTab === 'leaderboard' && (
                            <div className="p-4 sm:p-8 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 overflow-x-auto">
                                <h2 className="text-3xl font-bold text-white mb-6">Community Leaderboard 🏆</h2>
                                {leaderboard.length > 0 ? (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-white/80 border-b border-white/20">
                                                <th className="p-3 text-sm font-semibold">Rank</th>
                                                <th className="p-3 text-sm font-semibold">User</th>
                                                <th className="p-3 text-sm font-semibold text-right">Score</th>
                                                <th className="p-3 text-sm font-semibold text-center">Badges</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.map((user, index) => (
                                                <tr key={user.id} className={`border-b border-white/10 last:border-b-0 transition-colors ${user.id === userId ? 'bg-blue-500/20' : 'hover:bg-white/5'}`}>
                                                    <td className="p-4 font-bold text-xl w-16">#{index + 1}</td>
                                                    <td className="p-4 font-semibold flex items-center gap-3">
                                                        <img src={user.profilePicture} alt={user.displayName} className="h-10 w-10 rounded-full bg-white/10" />
                                                        {user.displayName || 'Anonymous'}
                                                    </td>
                                                    <td className="p-4 font-mono text-right">{user.score || 0}</td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {Object.keys(user.badges || {}).map(badgeId => (
                                                                user.badges[badgeId] && <span key={badgeId} title={BADGE_DEFINITIONS[badgeId]?.title} className="text-xl">{BADGE_DEFINITIONS[badgeId]?.emoji}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : <p className="text-white/60 text-center">Leaderboard is empty. Be the first to get a score!</p>}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}