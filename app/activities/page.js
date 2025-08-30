'use client';
import React, { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, MapPinIcon, CalendarIcon, ClockIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { db, auth } from '@/lib/firebaseClient';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CitySearchInput from '@/components/CitySearchInput';
import NavigationBarDark from '@/components/NavigationBarDark';

const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/(<([^>]+)>)/gi, "");
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function ActivitiesPage() {
    const [userId, setUserId] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [cityQuery, setCityQuery] = useState('');
    const [cityCode, setCityCode] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemDateTime, setItemDateTime] = useState({ date: '', time: '' });
    
    // --- NEW: State for fetching and selecting itineraries ---
    const [myTrips, setMyTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState('');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setUserId(user?.uid);
        });
        return () => unsubscribeAuth();
    }, []);

    // --- NEW: useEffect to fetch the user's trips for the dropdown ---
    useEffect(() => {
        if (!userId) {
            setMyTrips([]);
            return;
        }
        // Query for trips where the user is an accepted member
        const tripsRef = collection(db, `artifacts/${appId}/public/data/trips`);
        const q = query(tripsRef, where("accepted", "array-contains", userId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userTrips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // --- MODIFIED: Added a static 'Personal Itinerary' option ---
            const personalItinerary = { id: 'main', location: 'My Personal Itinerary' };
            setMyTrips([personalItinerary, ...userTrips]);
        });
        
        return () => unsubscribe(); // Cleanup listener
    }, [userId]);

    const handleSearch = async (e) => {
        e.preventDefault();
        let finalCityCode = cityCode;
        if (!finalCityCode && cityQuery.includes('(') && cityQuery.includes(')')) {
            const match = cityQuery.match(/\(([^)]+)\)/);
            if (match?.[1]) finalCityCode = match[1];
        }
        if (!finalCityCode) {
            alert("Please select a city from the search results dropdown.");
            return;
        }
        setIsSearching(true);
        setSearchResults([]);
        try {
            const response = await fetch(`/api/activities?keyword=${keyword}&cityCode=${finalCityCode}`);
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleOpenModal = (item) => {
        setSelectedItem(item);
        setItemDateTime({ date: '', time: '' });
        setSelectedTripId(''); // Reset selected trip
        setIsModalOpen(true);
    };

    const handleConfirmAddToItinerary = async (e) => {
        e.preventDefault();
        // --- MODIFIED: Added checks and logging ---
        if (!selectedTripId) {
            alert("Please select an itinerary to add this activity to.");
            return;
        }
        if (!itemDateTime.date || !itemDateTime.time || !userId) {
            alert("Please select a date and time.");
            return;
        }

        console.log("--- Attempting to Add Itinerary Item ---");
        console.log("UserID:", userId);
        console.log("Selected TripID:", selectedTripId);

        const newItem = {
            ...selectedItem,
            date: itemDateTime.date,
            time: itemDateTime.time,
            addedAt: serverTimestamp()
        };
        console.log("Item to Add:", newItem);

        try {
      // --- MODIFIED: Now handles saving to both Personal and Shared itineraries ---
            let itineraryItemsCollection;
            if (selectedTripId === 'main') {
                // Path for the user's personal, temporary item list
                itineraryItemsCollection = collection(db, "artifacts", "itinerary-builder-app", "users", userId, "pendingItems");
            } else {
                // Path for a specific trip's itinerary subcollection
                itineraryItemsCollection = collection(db, `artifacts/${appId}/public/data/trips`, selectedTripId, "itineraryItems");
            }
            await addDoc(itineraryItemsCollection, newItem);
            
            console.log("✅ SUCCESS: Item added to Firestore collection.");
            alert(`${selectedItem.name} has been added to your itinerary!`);
            
            setIsModalOpen(false);
            setSelectedItem(null);
            setSearchResults(prev => prev.filter(result => result.id !== selectedItem.id));

        } catch (error) {
            console.error("🔴 FIREBASE ERROR: Error adding item to pending collection: ", error);
            alert("Could not add item to itinerary. Check the browser console and your Firestore Security Rules.");
        }
    }
    return (
        <>
            
            <div className="min-h-screen w-full bg-cover bg-center font-inter text-white" style={{ backgroundImage: "url('/assets/activities.jpg')" }}>
                <div className='relative top-0 z-50'><NavigationBarDark /></div>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <div className="relative z-10 container mx-auto px-4 py-16">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-center mb-4 text-shadow-lg">Find Your Next Adventure</h1>
                    <p className="text-center text-white/80 text-lg mb-12 max-w-3xl mx-auto">
                        Discover points of interest, tours, and activities in your destination city. Add them to your schedule with a single click.
                    </p>

                    {/* Search Form */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl max-w-4xl mx-auto">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-5">
                            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g., museum, park" className="p-3 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-grow" />
                            
                            <div className="flex-grow">
                                <CitySearchInput
                                    value={cityQuery}
                                    onQueryChange={setCityQuery}
                                    onCitySelect={(iataCode) => {
                                        setCityCode(iataCode);
                                    }}
                                    placeholder="e.g., Paris"
                                />
                            </div>

                            <button type="submit" disabled={isSearching} className="flex items-center justify-center gap-2 p-3 bg-blue-600 font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                                {isSearching ? <ArrowPathIcon className="h-5 w-5 animate-spin"/> : <MagnifyingGlassIcon className="h-5 w-5" />} Search
                            </button>
                        </form>
                    </div>

                    {/* Search Results */}
                    <div className="mt-12">
                        {isSearching ? (
                             <div className="text-center text-white/70 py-10"><ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-300" /><p>Searching for activities...</p></div>
                        ) : searchResults.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                {searchResults.map((poi) => (
                                    <div key={poi.id} className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden border border-white/20 flex flex-col transition-transform hover:scale-105">
                                        {poi.pictures?.[0] && <img src={poi.pictures[0]} alt={poi.name} className="w-full h-48 object-cover" />}
                                        <div className="p-4 flex flex-col flex-grow">
                                            <h3 className="text-lg font-bold mb-2">{poi.name}</h3>
                                            
                                            {/* FIX: Use the stripHtml function to show plain text */}
                                            {poi.description && (
                                                <p className="text-sm text-white/70 mb-2 h-38 overflow-y-scroll no-scrollbar">
                                                    {stripHtml(poi.description)}
                                                </p>
                                            )}

                                            <p className="text-sm text-white/70 mb-2 flex items-center"><MapPinIcon className="h-4 w-4 mr-1.5 text-white/50 flex-shrink-0" /> {poi.category}</p>
                                            <p className="text-xl font-semibold text-blue-300 mb-4 mt-auto">${(poi.cost || 0).toFixed(2)}</p>
                                            <button onClick={() => handleOpenModal(poi)} className="w-full flex items-center justify-center gap-2 p-2 bg-blue-500 font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"><PlusIcon className="h-5 w-5" /> Add to Schedule</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for adding date and time */}
            {isModalOpen && selectedItem && (
<div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800/80 border border-white/20 rounded-2xl p-8 max-w-md w-full relative shadow-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white"><XMarkIcon className="h-7 w-7" /></button>
                        <h3 className="text-2xl font-bold mb-2">Add to Schedule</h3>
                        <p className="text-white/80 mb-6">Select an itinerary, date, and time for <span className="font-bold text-blue-300">{selectedItem.name}</span>.</p>
                        <form onSubmit={handleConfirmAddToItinerary} className="space-y-4">
                            
                            {/* NEW: Itinerary dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">Select Itinerary</label>
                                <select 
                                    value={selectedTripId} 
                                    onChange={(e) => setSelectedTripId(e.target.value)} 
                                    required
                                    className="w-full p-3 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="">-- Choose an itinerary --</option>
                                    {myTrips.map(trip => (
                                        // --- FIX: Added class to make dropdown option text visible ---
                                        <option key={trip.id} value={trip.id} className="text-black bg-white">
                                            {trip.location}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="date" value={itemDateTime.date} onChange={(e) => setItemDateTime({...itemDateTime, date: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg" /></div>
                            <div className="relative"><ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="time" value={itemDateTime.time} onChange={(e) => setItemDateTime({...itemDateTime, time: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg" /></div>
                            <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Confirm & Add</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
