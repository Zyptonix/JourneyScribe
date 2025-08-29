'use client';
import React, { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, MapPinIcon, CalendarIcon, ClockIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { db, auth } from '@/lib/firebaseClient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import CitySearchInput from '@/components/CitySearchInput'; // Import the component
import NavigationBarDark from '@/components/NavigationBarDark';

// Helper function to strip HTML tags using the provided regex
const stripHtml = (html) => {
    if (!html) return '';
    const regex = /(<([^>]+)>)/gi;
    return html.replace(regex, "");
};

export default function ActivitiesPage() {
    // State for Firebase
    const [userId, setUserId] = useState(null);

    // State for API search
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [keyword, setKeyword] = useState('');
    
    // New states for the CitySearchInput component
    const [cityQuery, setCityQuery] = useState(''); // The text inside the search input
    const [cityCode, setCityCode] = useState('');   // The selected IATA code

    // State for the "Add to Itinerary" modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemDateTime, setItemDateTime] = useState({ date: '', time: '' });
    
    // Authenticate user anonymously
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                await signInAnonymously(auth);
            }
            setUserId(user?.uid);
        });
        return () => unsubscribeAuth();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        
        let finalCityCode = cityCode;

        if (!finalCityCode && cityQuery.includes('(') && cityQuery.includes(')')) {
            const match = cityQuery.match(/\(([^)]+)\)/);
            if (match && match[1]) {
                finalCityCode = match[1];
            }
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
        setIsModalOpen(true);
    };

    const handleConfirmAddToItinerary = async (e) => {
        e.preventDefault();
        if (!itemDateTime.date || !itemDateTime.time || !userId) {
            alert("Please select a date and time.");
            return;
        }

        const newItem = {
            ...selectedItem,
            date: itemDateTime.date,
            time: itemDateTime.time,
            addedAt: serverTimestamp()
        };

        try {
            const pendingItemsCollection = collection(db, "artifacts", "itinerary-builder-app", "users", userId, "pendingItems");
            await addDoc(pendingItemsCollection, newItem);
            
            alert(`${selectedItem.name} has been added to your itinerary!`);
            setIsModalOpen(false);
            setSelectedItem(null);
            setSearchResults(prev => prev.filter(result => result.id !== selectedItem.id));

        } catch (error) {
            console.error("Error adding item to pending collection: ", error);
            alert("Could not add item to itinerary. Please try again.");
        }
    };

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
                        <p className="text-white/80 mb-6">Select a date and time for <span className="font-bold text-blue-300">{selectedItem.name}</span>.</p>
                        <form onSubmit={handleConfirmAddToItinerary} className="space-y-4">
                            <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="date" value={itemDateTime.date} onChange={(e) => setItemDateTime({...itemDateTime, date: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                            <div className="relative"><ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="time" value={itemDateTime.time} onChange={(e) => setItemDateTime({...itemDateTime, time: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                            <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Confirm & Add</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
