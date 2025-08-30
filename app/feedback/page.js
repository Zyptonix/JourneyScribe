"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CitySearchInput from '../../components/CitySearchInputgeo';
import { auth, db } from '../../lib/firebaseClient';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// ✅ 1. IMPORT YOUR NAVBAR COMPONENT
import NavigationBarDark from "../../components/NavigationBarDark"; // Adjust path if needed

// --- ICONS & COMPONENTS (Unchanged) ---
const StarIcon = ({ filled }) => <svg className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>;
const CloseIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const StarRating = ({ rating, size = 'md' }) => {
    const totalStars = 5;
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
        <div className="flex items-center">
            {[...Array(totalStars)].map((_, i) => (
                <svg key={i} className={`${sizeClass} ${i < Math.round(rating) ? 'text-yellow-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
            ))}
        </div>
    );
};

// --- MAIN FEEDBACK HUB PAGE ---
export default function FeedbackHubPage() {
    // ... (All your existing state hooks are unchanged) ...
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [detailedReviews, setDetailedReviews] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('rating');
    const [user, setUser] = useState(null);

    // ... (All your existing useEffect hooks and functions are unchanged) ...
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const fetchLocations = async () => {
        setLoading(true);
        const res = await fetch('/api/feedback');
        const data = await res.json();
        if (data.success) {
            setLocations(data.locations);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const handleCardClick = async (locationName) => {
        setSelectedLocation({ name: locationName, loading: true });
        const res = await fetch(`/api/feedback?location=${locationName}`);
        const data = await res.json();
        if (data.success) {
            setDetailedReviews(data.reviews);
            setSelectedLocation({ name: locationName, loading: false });
        }
    };

    const sortedLocations = [...locations].sort((a, b) => {
        if (sortOrder === 'rating') return b.avgRating - a.avgRating;
        if (sortOrder === 'reviews') return b.reviewCount - a.reviewCount;
        return a.location.localeCompare(b.location);
    });

    return (
        <main className="min-h-screen w-full bg-slate-900 text-white p-4 sm:p-8">
            {/* ✅ 2. ADD THE NAVBAR COMPONENT HERE */}
            <div className="fixed top-0 left-0 w-full z-20">
                <NavigationBarDark />
            </div>

            <div className="fixed inset-0 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/Feedback.avif')", filter: "blur(8px) brightness(0.3)", transform: "scale(1.1)" }}></div>
            
            {/* ✅ 3. ADD PADDING TO PREVENT CONTENT OVERLAP */}
            <div className="relative z-10 max-w-7xl mx-auto pt-20">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold">Travel Feedback Hub</h1>
                        <p className="text-slate-400">See what other travelers are saying.</p>
                    </div>
                    {user ? (
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 sm:mt-0 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold rounded-lg shadow-lg hover:opacity-90 transition-opacity">
                            + Add Your Feedback
                        </button>
                    ) : (
                        <p className="mt-4 sm:mt-0 px-6 py-3 bg-slate-700 text-slate-300 rounded-lg">Please sign in to add feedback</p>
                    )}
                </header>

                {/* ... (The rest of your page JSX is unchanged) ... */}
                 <div className="flex items-center gap-4 mb-6">
                    <span className="text-slate-300">Sort by:</span>
                    <button onClick={() => setSortOrder('rating')} className={`px-4 py-1 rounded-full text-sm ${sortOrder === 'rating' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Highest Rated</button>
                    <button onClick={() => setSortOrder('reviews')} className={`px-4 py-1 rounded-full text-sm ${sortOrder === 'reviews' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Most Reviews</button>
                    <button onClick={() => setSortOrder('alpha')} className={`px-4 py-1 rounded-full text-sm ${sortOrder === 'alpha' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Alphabetical</button>
                </div>
                {loading ? ( <p>Loading locations...</p> ) : (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedLocations.map(loc => (
                            <motion.div layoutId={loc.location} key={loc.location} onClick={() => handleCardClick(loc.location)} className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-cyan-400 transition-colors">
                                <h3 className="text-xl font-bold truncate">{loc.location}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <StarRating rating={loc.avgRating} />
                                    <span className="text-slate-300 font-bold">{loc.avgRating}</span>
                                    <span className="text-slate-400 text-sm">({loc.reviewCount} reviews)</span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {selectedLocation && <ReviewDetailsModal location={selectedLocation} reviews={detailedReviews} onClose={() => setSelectedLocation(null)} />}
                {isModalOpen && <FeedbackFormModal user={user} onClose={() => setIsModalOpen(false)} onSuccess={fetchLocations} />}
            </AnimatePresence>
        </main>
    );
}

// ... (The ReviewDetailsModal and FeedbackFormModal functions are unchanged) ...
function ReviewDetailsModal({ location, reviews, onClose }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div layoutId={location.name} className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <header className="p-5 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">{location.name}</h2>
                        <p className="text-slate-400">All user reviews</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><CloseIcon /></button>
                </header>
                <div className="p-5 overflow-y-auto">
                    {location.loading ? <p>Loading reviews...</p> : (
                        <ul className="space-y-4">
                            {reviews.map(r => (
                                <li key={r.id} className="bg-slate-900/50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{r.username}</p>
                                        <StarRating rating={r.rating} size="sm" />
                                    </div>
                                    <p className="text-slate-300 mt-2">{r.comment}</p>
                                    <small className="text-slate-500 mt-2 block">{new Date(r.createdAt.seconds * 1000).toLocaleString()}</small>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// Replace the existing FeedbackFormModal function with this one

function FeedbackFormModal({ onClose, onSuccess, user }) {
    const [location, setLocation] = useState("");
    const [username, setUsername] = useState("Loading your name...");
    const [rating, setRating] = useState(5);
    
    // NEW: State to manage the hover effect for the stars
    const [hoverRating, setHoverRating] = useState(0);

    const [comment, setComment] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            const fetchUserProfile = async () => {
                const userDocRef = doc(db, 'userProfiles', user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists() && docSnap.data().fullName) {
                    setUsername(docSnap.data().fullName);
                } else {
                    setUsername("Name not found in profile");
                }
            };
            fetchUserProfile();
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!location || !username || username.includes('Loading') || username.includes('not found') || !comment) {
            setMessage("⚠️ Please fill all fields and ensure your name is loaded.");
            return;
        }
        setLoading(true);
        // The API call remains the same, as 'rating' is still a number
        const res = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location: location.split('(')[0].trim(), username, rating, comment }),
        });
        const data = await res.json();
        if(data.success) {
            setMessage("✅ Success! Your feedback has been submitted.");
            onSuccess();

            setTimeout(() => onClose(), 1500);
        } else {
            setMessage(`❌ Error: ${data.message}`);
        }
        setLoading(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg">
                <header className="p-5 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Share Your Experience</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><CloseIcon /></button>
                </header>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <CitySearchInput 
                        value={location} 
                        onQueryChange={setLocation} 
                        placeholder="Enter Location (e.g. Paris)" 
                        onCitySelect={(city) => setLocation(`${city.name} (${city.iataCode})`)}
                    />
                    <div className="w-full p-3 bg-slate-700/50 text-slate-300 rounded-lg border border-slate-600">
                        Posting as: <span className="font-semibold text-white">{username}</span>
                    </div>

                    {/* --- REPLACED <select> WITH INTERACTIVE STARS --- */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Your Rating</label>
                        <div 
                            className="flex items-center gap-1"
                            onMouseLeave={() => setHoverRating(0)} // Reset hover when mouse leaves the container
                        >
                            {[...Array(5)].map((_, index) => {
                                const starValue = index + 1;
                                return (
                                    <button
                                        type="button" // Important to prevent form submission
                                        key={starValue}
                                        className="cursor-pointer"
                                        onClick={() => setRating(starValue)}
                                        onMouseEnter={() => setHoverRating(starValue)}
                                    >
                                        <StarIcon 
                                            filled={(hoverRating || rating) >= starValue}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <textarea placeholder="Write your feedback..." value={comment} onChange={e => setComment(e.target.value)} rows="4" className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-cyan-500 focus:border-cyan-500" />
                    <button type="submit" disabled={loading || username.includes('Loading')} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                        {loading ? "Submitting..." : "Submit Feedback"}
                    </button>
                    {message && <p className={`text-center text-sm ${message.includes('Success') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}
                </form>
            </div>
        </motion.div>
    );
}