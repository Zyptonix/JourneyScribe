'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusIcon, CurrencyDollarIcon, CalendarIcon, ClockIcon, TrashIcon, CloudArrowUpIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { db, auth } from '@/lib/firebaseClient';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Helper to format 24-hour time to 12-hour AM/PM format
const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hour, minute] = time24.split(':');
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12; // Convert hour 0 to 12
    return `${hour12.toString().padStart(2, '0')}:${minute} ${ampm}`;
};

// Helper function to strip HTML tags using regex
const stripHtml = (html) => {
    if (!html) return '';
    const regex = /(<([^>]+)>)/gi;
    return html.replace(regex, "");
};


export default function ItineraryPage() {
    // State for Firebase
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isItineraryLoading, setIsItineraryLoading] = useState(true);

    // State for the full itinerary
    const [itinerary, setItinerary] = useState([]);
    
    // State for manual event form
    const [manualEvent, setManualEvent] = useState({ name: '', cost: '', date: '', time: '' });
    
    // Ref to prevent auto-saving on the initial load
    const isInitialMount = useRef(true);

    // Authenticate user
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                await signInAnonymously(auth);
            }
            setUserId(user?.uid);
            setIsAuthReady(true);
        });
        return () => unsubscribeAuth();
    }, []);

    // Listen for changes to the main itinerary and pending items
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        const itineraryDocRef = doc(db, "artifacts", "itinerary-builder-app", "users", userId, "currentItinerary", "main");
        const unsubscribeItinerary = onSnapshot(itineraryDocRef, (doc) => {
            if (doc.exists()) {
                setItinerary(doc.data().events || []);
            }
            setIsItineraryLoading(false);
        });

        const pendingItemsCollection = collection(db, "artifacts", "itinerary-builder-app", "users", userId, "pendingItems");
        const q = query(pendingItemsCollection, orderBy("addedAt", "asc"));
        const unsubscribePending = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach(async (doc) => {
                const newItem = { id: doc.id, ...doc.data() };
                setItinerary(prev => {
                    if (prev.some(item => item.id === newItem.id)) {
                        return prev;
                    }
                    return [...prev, newItem];
                });
                await deleteDoc(doc.ref);
            });
        });

        return () => {
            unsubscribeItinerary();
            unsubscribePending();
        };
    }, [isAuthReady, userId]);

    // Auto-save itinerary function
    const autoSaveItinerary = useCallback(async (currentItinerary) => {
        if (!userId || isItineraryLoading) return;
        try {
            const itineraryDocRef = doc(db, "artifacts", "itinerary-builder-app", "users", userId, "currentItinerary", "main");
            await setDoc(itineraryDocRef, { events: currentItinerary });
            console.log("Autosaved itinerary.");
        } catch (e) {
            console.error("Error auto-saving document: ", e);
        }
    }, [userId, isItineraryLoading]);

    // useEffect hook to trigger auto-save on itinerary changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const handler = setTimeout(() => {
            autoSaveItinerary(itinerary);
        }, 1500); // Debounce for 1.5 seconds

        return () => {
            clearTimeout(handler);
        };
    }, [itinerary, autoSaveItinerary]);

    const handleAddManualEvent = (e) => {
        e.preventDefault();
        if (!manualEvent.name || !manualEvent.date || !manualEvent.time) {
            alert("Please fill in the event name, date, and time.");
            return;
        }
        setItinerary(prev => [...prev, {
            id: `manual-${Date.now()}`,
            name: manualEvent.name,
            cost: parseFloat(manualEvent.cost) || 0,
            date: manualEvent.date,
            time: manualEvent.time,
            category: 'Custom Event',
            type: 'manual'
        }]);
        setManualEvent({ name: '', cost: '', date: '', time: '' });
    };

    const handleRemoveFromItinerary = (id) => {
        setItinerary(prev => prev.filter(item => item.id !== id));
    };

    const groupItineraryByDay = (itinerary) => {
        const sorted = [...itinerary].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        return sorted.reduce((acc, item) => {
            const date = item.date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(item);
            return acc;
        }, {});
    };

    const totalCost = itinerary.reduce((sum, event) => sum + (event.cost || 0), 0);
    const itineraryByDay = groupItineraryByDay(itinerary);

    return (
        <>
            <div className="fixed inset-0 -z-10 h-full w-full" style={{ backgroundImage: "url('/assets/itinerary3.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm -z-10" />

            <div className="min-h-screen font-inter flex flex-col items-center pt-28 pb-12 px-4 relative z-10 text-white">
                <div className="w-full max-w-7xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-center mb-4 text-shadow-lg">Your Trip Itinerary</h1>
                    <p className="text-center text-white/80 mb-12">Manage your schedule, add custom events, and keep track of your budget. Your changes are saved automatically.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Add Event Form */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-28">
                                <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-6 border border-white/20 shadow-2xl">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                        <PlusIcon className="h-6 w-6 text-green-400" /> Add a Custom Event
                                    </h2>
                                    <form onSubmit={handleAddManualEvent} className="space-y-4">
                                        <input type="text" value={manualEvent.name} onChange={(e) => setManualEvent({...manualEvent, name: e.target.value})} placeholder="Event Name" required className="w-full p-3 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" />
                                        <div className="relative"><CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="number" value={manualEvent.cost} onChange={(e) => setManualEvent({...manualEvent, cost: e.target.value})} placeholder="Cost" className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                                        
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                                            <input 
                                                type="date" 
                                                value={manualEvent.date} 
                                                onChange={(e) => setManualEvent({...manualEvent, date: e.target.value})} 
                                                required 
                                                className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" 
                                            />
                                        </div>

                                        <div className="relative">
                                            <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                                            <input 
                                                type="time" 
                                                value={manualEvent.time} 
                                                onChange={(e) => setManualEvent({...manualEvent, time: e.target.value})} 
                                                required 
                                                className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400"
                                            />
                                        </div>

                                        <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"><PlusIcon className="h-5 w-5" />Add to Schedule</button>
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Itinerary Display */}
                        <div className="lg:col-span-2">
                            <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-8 border border-white/20 shadow-2xl">
                                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                                    <h2 className="text-3xl font-bold">Trip Schedule</h2>
                                    <div className="text-xl font-semibold text-white/90">Budget: <span className="text-green-300 font-extrabold">${totalCost.toFixed(2)}</span></div>
                                </div>
                                
                                {isItineraryLoading ? (
                                    <div className="text-center text-white/70 py-10"><ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-300" /><p>Loading your saved itinerary...</p></div>
                                ) : Object.keys(itineraryByDay).length === 0 ? (
                                    <p className="text-white/60 italic text-center py-10">Your schedule is empty. Add activities to begin planning!</p>
                                ) : (
                                    <div className="space-y-8">
                                        {Object.entries(itineraryByDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, events]) => (
                                            <div key={date}>
                                                <h3 className="text-2xl font-bold text-white border-b-2 border-blue-400/50 pb-2 mb-6">
                                                    {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </h3>
                                                <div className="relative pl-8 space-y-6 border-l-2 border-white/30">
                                                    {events.map((item) => (
                                                        <div key={item.id} className="relative">
                                                            <div className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full bg-blue-400 ring-4 ring-blue-500/50"></div>
                                                            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-blue-300">{formatTime12Hour(item.time)}</p>
                                                                        <h4 className="text-xl font-bold mt-1">{item.name}</h4>
                                                                        
                                                                        {/* FIX: Use the stripHtml function */}
                                                                        {item.description && (
                                                                            <p className="text-sm text-white/70 mt-2">
                                                                                {stripHtml(item.description)}
                                                                            </p>
                                                                        )}

                                                                        <p className="text-sm text-white/70 mt-1">{item.category}</p>
                                                                    </div>
                                                                    <div className="text-right flex-shrink-0 ml-4">
                                                                        {item.cost > 0 && (
                                                                            <p className="text-lg font-semibold text-green-300">${(item.cost).toFixed(2)}</p>
                                                                        )}
                                                                        <button onClick={() => handleRemoveFromItinerary(item.id)} className="mt-2 p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-500 transition-colors">
                                                                            <TrashIcon className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
