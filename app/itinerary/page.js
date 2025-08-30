'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusIcon, CurrencyDollarIcon, CalendarIcon, ClockIcon, TrashIcon, CloudArrowUpIcon, ArrowPathIcon, XMarkIcon, TicketIcon, BuildingOffice2Icon } from '@heroicons/react/24/solid';
import { db, auth } from '@/lib/firebaseClient';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, where, getDocs } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Global variables ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Helper Functions ---
const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hour, minute] = time24.split(':');
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minute} ${ampm}`;
};

const stripHtml = (html) => {
    if (!html) return '';
    const regex = /(<([^>]+)>)/gi;
    return html.replace(regex, "");
};

// --- Main Component ---
export default function ItineraryPage() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isItineraryLoading, setIsItineraryLoading] = useState(true);

    const [itinerary, setItinerary] = useState([]);
    const [manualEvent, setManualEvent] = useState({ name: '', cost: '', date: '', time: '' });
    
    const [availableItineraries, setAvailableItineraries] = useState([]);
    const [selectedItineraryId, setSelectedItineraryId] = useState('main');

    // State for booking modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null); // 'flight' or 'hotel'
    const [flightBookings, setFlightBookings] = useState([]);
    const [hotelBookings, setHotelBookings] = useState([]);

    const isInitialMount = useRef(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {

            setUserId(user?.uid);
            setIsAuthReady(true);
        });
        return () => unsubscribeAuth();
    }, []);

    // Fetch joined trips to populate the itinerary selector
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        const tripsRef = collection(db, `artifacts/${appId}/public/data/trips`);
        const q = query(tripsRef, where("accepted", "array-contains", userId));
        
        const unsubscribeTrips = onSnapshot(q, (snapshot) => {
            const personalItinerary = { id: 'main', name: 'My Personal Itinerary' };
            const sharedTrips = snapshot.docs.map(doc => ({
                id: doc.id,
                name: `Trip: ${doc.data().location}`
            }));
            setAvailableItineraries([personalItinerary, ...sharedTrips]);
        });

        return () => unsubscribeTrips();
    }, [isAuthReady, userId]);

    // Listen for changes to the selected itinerary
    useEffect(() => {
        if (!isAuthReady || !userId || !selectedItineraryId) return;
        
        setIsItineraryLoading(true);
        let itineraryDocRef;

        if (selectedItineraryId === 'main') {
            itineraryDocRef = doc(db, "artifacts", "itinerary-builder-app", "users", userId, "currentItinerary", "main");
        } else {
            itineraryDocRef = doc(db, `artifacts/${appId}/public/data/trips`, selectedItineraryId, "itinerary", "main");
        }

        const unsubscribeItinerary = onSnapshot(itineraryDocRef, (doc) => {
            setItinerary(doc.exists() ? doc.data().events || [] : []);
            setIsItineraryLoading(false);
        });

        const pendingItemsCollection = collection(db, "artifacts", "itinerary-builder-app", "users", userId, "pendingItems");
        const q = query(pendingItemsCollection, orderBy("addedAt", "asc"));
        const unsubscribePending = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach(async (doc) => {
                const newItem = { id: doc.id, ...doc.data() };
                setItinerary(prev => [...prev, newItem]);
                await deleteDoc(doc.ref);
            });
        });

        return () => {
            unsubscribeItinerary();
            unsubscribePending();
        };
    }, [isAuthReady, userId, selectedItineraryId]);

    // Auto-save itinerary
    const autoSaveItinerary = useCallback(async (currentItinerary) => {
        if (!userId || isItineraryLoading || !selectedItineraryId) return;
        
        let itineraryDocRef;
        if (selectedItineraryId === 'main') {
            itineraryDocRef = doc(db, "artifacts", "itinerary-builder-app", "users", userId, "currentItinerary", "main");
        } else {
            itineraryDocRef = doc(db, `artifacts/${appId}/public/data/trips`, selectedItineraryId, "itinerary", "main");
        }

        try {
            await setDoc(itineraryDocRef, { events: currentItinerary });
            console.log(`Autosaved itinerary for: ${selectedItineraryId}`);
        } catch (e) {
            console.error("Error auto-saving document: ", e);
        }
    }, [userId, isItineraryLoading, selectedItineraryId]);
    
    useEffect(() => {
        if (isInitialMount.current || isItineraryLoading) {
            isInitialMount.current = false;
            return;
        }
        const handler = setTimeout(() => autoSaveItinerary(itinerary), 1500);
        return () => clearTimeout(handler);
    }, [itinerary, autoSaveItinerary, isItineraryLoading]);

    const handleAddManualEvent = (e) => {
        e.preventDefault();
        if (!manualEvent.name || !manualEvent.date || !manualEvent.time) return;
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

    // --- Booking Modal Logic ---
    const handleOpenBookingModal = async (type) => {
        if (!userId) return;
        setModalType(type);
        if (type === 'flight') {
            const flightCollection = collection(db, 'userProfiles', userId, 'bookings');
            const flightSnapshot = await getDocs(flightCollection);
            setFlightBookings(flightSnapshot.docs.map(d => ({id: d.id, ...d.data()})));
        } else {
            const hotelCollection = collection(db, 'userProfiles', userId, 'hotelBookings');
            const hotelSnapshot = await getDocs(hotelCollection);
            setHotelBookings(hotelSnapshot.docs.map(d => ({id: d.id, ...d.data()})));
        }
        setIsModalOpen(true);
    };

    const handleAddBookingToItinerary = (booking) => {
        const newEvents = [];
        if (modalType === 'flight' && booking.flightOffers && booking.flightOffers.length > 0) {
            const flightOffer = booking.flightOffers[0];
            const segments = flightOffer.itineraries[0].segments;

            segments.forEach((segment, index) => {
                const departureTime = new Date(segment.departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                const newEvent = {
                    id: `flight-${booking.id}-${segment.id}`,
                    name: `Flight from ${segment.departure.iataCode} to ${segment.arrival.iataCode}`,
                    cost: index === 0 ? parseFloat(flightOffer.price.total) : 0,
                    date: segment.departure.at.split('T')[0],
                    time: departureTime,
                    category: `Flight ${segment.carrierCode} ${segment.number}`,
                    type: 'flight'
                };
                newEvents.push(newEvent);
            });

        } else if (modalType === 'hotel' && booking.amadeusResponse?.data?.hotelBookings?.[0]) {
            const hotelBooking = booking.amadeusResponse.data.hotelBookings[0];
            newEvents.push({
                id: `hotel-${booking.id}`,
                name: `Check-in: ${hotelBooking.hotel.name}`,
                cost: parseFloat(hotelBooking.hotelOffer.price.total),
                date: hotelBooking.hotelOffer.checkInDate,
                time: '15:00', // Default check-in time
                category: 'Hotel Booking',
                type: 'hotel'
            });
        }
        setItinerary(prev => [...prev, ...newEvents]);
        setIsModalOpen(false);
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
            <div className='relative top-0 z-50'><NavigationBarDark /></div>

            <div className="min-h-screen font-inter flex flex-col items-center pt-10 pb-12 px-4 relative z-10 text-white">
                <div className="w-full max-w-7xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-center mb-4 text-shadow-lg">Your Trip Itinerary</h1>
                    <p className="text-center text-white/80 mb-8">Manage your schedule, add custom events, and keep track of your budget.</p>
                    
                    <div className="max-w-md mx-auto mb-12">
                        <label htmlFor="itinerary-select" className="block text-sm font-medium text-zinc-300 mb-1 text-center">Select an Itinerary to View/Edit</label>
                        <select id="itinerary-select" value={selectedItineraryId} onChange={(e) => setSelectedItineraryId(e.target.value)} className="w-full p-3 bg-black/30 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center font-semibold">
                            {availableItineraries.map(it => <option key={it.id} value={it.id} className="bg-gray-800">{it.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-28 space-y-6">
                                {/* Add Custom Event Form */}
                                <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-6 border border-white/20 shadow-2xl">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><PlusIcon className="h-6 w-6 text-green-400" /> Add a Custom Event</h2>
                                    <form onSubmit={handleAddManualEvent} className="space-y-4">
                                        <input type="text" value={manualEvent.name} onChange={(e) => setManualEvent({...manualEvent, name: e.target.value})} placeholder="Event Name" required className="w-full p-3 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" />
                                        <div className="relative"><CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="number" value={manualEvent.cost} onChange={(e) => setManualEvent({...manualEvent, cost: e.target.value})} placeholder="Cost" className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                                        <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="date" value={manualEvent.date} onChange={(e) => setManualEvent({...manualEvent, date: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                                        <div className="relative"><ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="time" value={manualEvent.time} onChange={(e) => setManualEvent({...manualEvent, time: e.target.value})} required className="w-full p-3 pl-10 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                                        <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"><PlusIcon className="h-5 w-5" />Add to Schedule</button>
                                    </form>
                                </div>
                                {/* Add Bookings Section */}
                                <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-6 border border-white/20 shadow-2xl">
                                    <h2 className="text-2xl font-bold mb-4">Add Confirmed Bookings</h2>
                                    <div className="space-y-4">
                                        <button onClick={() => handleOpenBookingModal('flight')} className="w-full flex items-center justify-center gap-2 p-3 bg-sky-600 font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-colors"><TicketIcon className="h-5 w-5" /> Add Flight Booking</button>
                                        <button onClick={() => handleOpenBookingModal('hotel')} className="w-full flex items-center justify-center gap-2 p-3 bg-amber-600 font-semibold rounded-lg shadow-md hover:bg-amber-700 transition-colors"><BuildingOffice2Icon className="h-5 w-5" /> Add Hotel Booking</button>
                                    </div>
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
                                    <div className="text-center text-white/70 py-10"><ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-300" /><p>Loading itinerary...</p></div>
                                ) : Object.keys(itineraryByDay).length === 0 ? (
                                    <p className="text-white/60 italic text-center py-10">This schedule is empty. Add events to begin planning!</p>
                                ) : (
                                    <div className="space-y-8">
                                        {Object.entries(itineraryByDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, events]) => (
                                            <div key={date}>
                                                <h3 className="text-2xl font-bold text-white border-b-2 border-blue-400/50 pb-2 mb-6">{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                                <div className="relative pl-8 space-y-6 border-l-2 border-white/30">
                                                    {events.map((item) => (
                                                        <div key={item.id} className="relative">
                                                            <div className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full bg-blue-400 ring-4 ring-blue-500/50"></div>
                                                            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-blue-300">{formatTime12Hour(item.time)}</p>
                                                                        <h4 className="text-xl font-bold mt-1">{item.name}</h4>
                                                                        {item.description && <p className="text-sm text-white/70 mt-2 h-24 overflow-y-auto scrollbar-hide">{stripHtml(item.description)}</p>}
                                                                        <p className="text-sm text-white/70 mt-1">{item.category}</p>
                                                                    </div>
                                                                    <div className="text-right flex-shrink-0 ml-4">
                                                                        {item.cost > 0 && <p className="text-lg font-semibold text-green-300">${(item.cost).toFixed(2)}</p>}
                                                                        <button onClick={() => handleRemoveFromItinerary(item.id)} className="mt-2 p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-500 transition-colors"><TrashIcon className="h-4 w-4" /></button>
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

            {/* Booking Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800/80 border border-white/20 rounded-2xl p-8 max-w-lg w-full relative shadow-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white"><XMarkIcon className="h-7 w-7" /></button>
                        <h3 className="text-2xl font-bold mb-4">Add {modalType === 'flight' ? 'Flight' : 'Hotel'} Booking</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {modalType === 'flight' && (flightBookings.length > 0 ? flightBookings.map(booking => (
                                <div key={booking.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                                    <div>
                                        <p className="font-bold">{booking.flightOffers[0].itineraries[0].segments.map(s => s.carrierCode + ' ' + s.number).join(', ')}</p>
                                        <p className="text-sm text-white/70">{booking.flightOffers[0].itineraries[0].segments[0].departure.iataCode} → {booking.flightOffers[0].itineraries[0].segments.slice(-1)[0].arrival.iataCode}</p>
                                    </div>
                                    <button onClick={() => handleAddBookingToItinerary(booking)} className="px-3 py-1 text-xs bg-blue-600 rounded-md hover:bg-blue-700">Add</button>
                                </div>
                            )) : <p className="text-white/70 text-center">No flight bookings found.</p>)}
                            
                            {modalType === 'hotel' && (hotelBookings.length > 0 ? hotelBookings.map(booking => {
                                const hotelInfo = booking.amadeusResponse?.data?.hotelBookings?.[0];
                                return (
                                    <div key={booking.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                                        <div>
                                            <p className="font-bold">{hotelInfo?.hotel.name || 'Unknown Hotel'}</p>
                                            <p className="text-sm text-white/70">{hotelInfo?.hotelOffer.checkInDate} to {hotelInfo?.hotelOffer.checkOutDate}</p>
                                        </div>
                                        <button onClick={() => handleAddBookingToItinerary(booking)} className="px-3 py-1 text-xs bg-blue-600 rounded-md hover:bg-blue-700">Add</button>
                                    </div>
                                );
                            }) : <p className="text-white/70 text-center">No hotel bookings found.</p>)}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
