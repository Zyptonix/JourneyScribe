'use client';

import React, { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, MapPinIcon, CurrencyDollarIcon, CalendarIcon, ClockIcon, TrashIcon, CloudArrowUpIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { db, auth } from '@/lib/firebaseClient';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const ItineraryBuilder = () => {
  // State for Firebase
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isItineraryLoading, setIsItineraryLoading] = useState(true);

  // State for the full itinerary
  const [itinerary, setItinerary] = useState([]);
  const [saving, setSaving] = useState(false);

  // State for API search
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [cityCode, setCityCode] = useState('');

  // State for manual event form
  const [manualEvent, setManualEvent] = useState({ name: '', cost: '', date: '', time: '' });
  
  // State for the "Add to Itinerary" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDateTime, setItemDateTime] = useState({ date: '', time: '' });

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

  useEffect(() => {
    const loadItinerary = async () => {
      if (userId) {
        setIsItineraryLoading(true);
        try {
          const itineraryCollection = collection(db, "artifacts", "itinerary-builder-app", "users", userId, "itineraries");
          const q = query(itineraryCollection, orderBy("createdAt", "desc"));
          const querySnapshot = await getDocs(q);
          const loadedItinerary = [];
          querySnapshot.forEach((doc) => {
            loadedItinerary.push(...doc.data().itinerary);
          });
          setItinerary(loadedItinerary);
        } catch (e) {
          console.error("Error loading documents: ", e);
        } finally {
          setIsItineraryLoading(false);
        }
      }
    };
    if (isAuthReady) {
      loadItinerary();
    }
  }, [userId, isAuthReady]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    const cleanedCityCode = cityCode.split(' ')[0].toUpperCase();
    try {
      const response = await fetch(`/api/activities?keyword=${keyword}&cityCode=${cleanedCityCode}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToItinerary = (item) => {
    setSelectedItem(item);
    setItemDateTime({ date: '', time: '' });
    setIsModalOpen(true);
  };

  const handleConfirmAddToItinerary = (e) => {
    e.preventDefault();
    if (!itemDateTime.date || !itemDateTime.time) {
      alert("Please select a date and time.");
      return;
    }
    const newItem = {
      ...selectedItem,
      id: `${selectedItem.id}-${Date.now()}-${Math.random()}`,
      date: itemDateTime.date,
      time: itemDateTime.time,
    };
    setItinerary(prev => [...prev, newItem]);
    setSearchResults(prev => prev.filter(result => result.id !== selectedItem.id));
    setIsModalOpen(false);
    setSelectedItem(null);
  };

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
      category: 'Manual Entry',
      type: 'manual'
    }]);
    setManualEvent({ name: '', cost: '', date: '', time: '' });
  };

  const handleRemoveFromItinerary = (id) => {
    setItinerary(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveItinerary = async () => {
    if (!userId) {
      alert("Authentication error: Please try again.");
      return;
    }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "artifacts", "itinerary-builder-app", "users", userId, "itineraries"), {
        itinerary: itinerary,
        createdAt: new Date(),
      });
      console.log("Document written with ID: ", docRef.id);
      alert("Itinerary saved successfully!");
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Failed to save itinerary.");
    } finally {
      setSaving(false);
    }
  };

  const groupItineraryByDay = (itinerary) => {
    const sorted = [...itinerary].sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    return sorted.reduce((acc, item) => {
        const date = item.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});
  };

  const totalCost = itinerary.reduce((sum, event) => sum + (event.cost || 0), 0);
  const itineraryByDay = groupItineraryByDay(itinerary);

  return (
    <>
<div className="fixed inset-0 -z-10 h-full w-full blur" style={{ backgroundImage: "url('/assets/itinerary3.jpg')" }}></div>
<img src="/assets/itinerary1.svg" alt="Travel illustration" className="fixed top-40 left-20 w-128 -z-10" />
<img src="/assets/itinerary2.svg" alt="Adventure illustration" className="fixed top-40 left-230 w-128 -z-10" />
<div className="fixed inset-x-0 top-0 h-full bg-gradient-to-b from-black to-blue-900 opacity-30 -z-10"></div>

      <div className="min-h-screen font-inter flex flex-col items-center pt-28 pb-12 px-4 relative z-10">
        <div className="w-full max-w-7xl">
          <h1 
            className="text-6xl font-extrabold text-center text-white mb-2" 
            style={{ textShadow: '0 0 15px rgba(0, 0, 25, 0.7)' }}
          >
            Itinerary Builder
          </h1>
          <p className="text-center text-white/80 mb-100">
            Craft your perfect journey. Search for activities or add your own events to build a detailed schedule.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Search Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <MagnifyingGlassIcon className="h-6 w-6 text-blue-400" />
                Search for Activities
              </h2>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                 <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g., museum, park" className="p-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-grow" />
                 <input type="text" value={cityCode} onChange={(e) => setCityCode(e.target.value)} placeholder="e.g., PAR (Paris)" className="p-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-grow" />
                <button type="submit" disabled={isSearching} className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                  {isSearching ? <ArrowPathIcon className="h-5 w-5 animate-spin"/> : <MagnifyingGlassIcon className="h-5 w-5" />} Search
                </button>
              </form>
            </div>

            {/* Manual Event Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <PlusIcon className="h-6 w-6 text-green-300" />
                Add a Custom Event
              </h2>
              <form onSubmit={handleAddManualEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" value={manualEvent.name} onChange={(e) => setManualEvent({...manualEvent, name: e.target.value})} placeholder="Event Name" required className="p-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 col-span-2" />
                <div className="relative"><CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="number" value={manualEvent.cost} onChange={(e) => setManualEvent({...manualEvent, cost: e.target.value})} placeholder="Cost" className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="date" value={manualEvent.date} onChange={(e) => setManualEvent({...manualEvent, date: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                <div className="relative"><ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="time" value={manualEvent.time} onChange={(e) => setManualEvent({...manualEvent, time: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                <button type="submit" className="flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors col-span-2"><PlusIcon className="h-5 w-5" />Add to Schedule</button>
              </form>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl mb-12">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
              <h2 className="text-3xl font-bold text-white">Your Trip Schedule</h2>
              <div className="text-xl font-semibold text-white/90">Total Budget: <span className="text-green-300 font-extrabold">${totalCost.toFixed(2)}</span></div>
            </div>
             <div className="flex justify-end mb-6">
                <button onClick={handleSaveItinerary} disabled={saving || itinerary.length === 0} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                    {saving ? <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Saving...</> : <><CloudArrowUpIcon className="h-5 w-5" /> Save Itinerary</>}
                </button>
            </div>
            
            {isItineraryLoading ? (
              <div className="text-center text-white/70 py-10"><ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-300" /><p>Loading your saved itinerary...</p></div>
            ) : Object.keys(itineraryByDay).length === 0 ? (
              <p className="text-white/60 italic text-center py-10">Your schedule is empty. Add activities to begin planning!</p>
            ) : (
              <div className="space-y-8">
                {Object.entries(itineraryByDay).map(([date, events]) => (
                  <div key={date}>
                    <h3 className="text-2xl font-bold text-white border-b-2 border-blue-400 pb-2 mb-4">
                      {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <div className="relative pl-6 space-y-6 border-l-2 border-white/30">
                      {events.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="relative">
                          <div className="absolute -left-[34px] top-1 h-4 w-4 rounded-full bg-blue-400 ring-4 ring-blue-500/50"></div>
                          <div className="bg-black/20 p-4 rounded-lg ml-4 border border-white/10">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-semibold text-blue-300">{item.time}</p>
                                <h4 className="text-xl font-bold text-white mt-1">{item.name}</h4>
                                <p className="text-sm text-white/70 mt-1">{item.category}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-lg font-semibold text-green-300">${(item.cost || 0).toFixed(2)}</p>
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

          {searchResults.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 border-b border-white/20 pb-3">Search Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map((poi) => (
                  <div key={poi.id} className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden border border-white/20 flex flex-col">
                    {poi.pictures?.[0] && <img src={poi.pictures[0]} alt={poi.name} className="w-full h-40 object-cover" />}
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-bold text-white mb-2">{poi.name}</h3>
                      <p className="text-sm text-white/70 mb-2 flex items-center"><MapPinIcon className="h-4 w-4 mr-1.5 text-white/50 flex-shrink-0" /> {poi.category}</p>
                      <p className="text-xl font-semibold text-blue-300 mb-4 mt-auto">${(poi.cost || 0).toFixed(2)}</p>
                      <button onClick={() => handleAddToItinerary(poi)} className="w-full flex items-center justify-center gap-2 p-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"><PlusIcon className="h-5 w-5" /> Add to Schedule</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/80 border border-white/20 rounded-2xl p-8 max-w-md w-full relative shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white"><XMarkIcon className="h-7 w-7" /></button>
            <h3 className="text-2xl font-bold text-white mb-2">Add to Schedule</h3>
            <p className="text-white/80 mb-6">Select a date and time for <span className="font-bold text-blue-300">{selectedItem.name}</span>.</p>
            <form onSubmit={handleConfirmAddToItinerary} className="space-y-4">
                <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="date" value={itemDateTime.date} onChange={(e) => setItemDateTime({...itemDateTime, date: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <div className="relative"><ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="time" value={itemDateTime.time} onChange={(e) => setItemDateTime({...itemDateTime, time: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Confirm & Add</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ItineraryBuilder;
