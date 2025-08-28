'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { auth, db } from '@/lib/firebaseClient'; // Your firebase config
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query } from 'firebase/firestore';
import NavigationBarDark from '@/components/NavigationBarDark';
import Link from 'next/link'; // 1. Import the Link component

// --- ICONS (can be in a separate file) ---
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const HotelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-300/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// 2. Create a new TicketIcon to replace the QRIcon
const TicketIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;


// --- Helper to format dates ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

// --- Boarding Pass Style Component for Flights ---
const FlightBookingCard = ({ booking }) => {
    const flightOffer = booking.raw?.data?.flightOffers?.[0];
    const travelers = booking.raw?.data?.travelers;
    const confirmationId = booking.raw?.data?.associatedRecords?.[0]?.reference;

    const travelerId = flightOffer?.travelerPricings?.[0]?.travelerId;
    
    let passengerName = 'Passenger';

    if (travelerId && travelers) {
        const passenger = travelers.find(t => t.id === travelerId);
        if (passenger && passenger.name) {
            passengerName = `${passenger.name.firstName || ''} ${passenger.name.lastName || ''}`.trim();
        }
    }
    
    const segment = flightOffer?.itineraries?.[0]?.segments?.[0];
    const returnSegment = flightOffer?.itineraries?.[1]?.segments?.[0];

    return (
        <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row my-4">
            {/* Main Pass Info */}
            <div className="p-6 flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-slate-300">Boarding Pass</p>
                        <h3 className="text-2xl font-bold text-white">{segment?.carrierCode} {segment?.number}</h3>
                    </div>
                    <div className="text-right">
                         <p className="text-xl font-bold text-cyan-400">{segment?.departure?.iataCode} ✈ {segment?.arrival?.iataCode}</p>
                         {returnSegment && <p className="text-md font-bold text-cyan-400 mt-1">{returnSegment?.departure?.iataCode} ✈ {returnSegment?.arrival?.iataCode}</p>}
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
                    <div>
                        <p className="text-xs text-slate-400">Passenger</p>
                        <p className="font-medium">{passengerName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Date</p>
                        <p className="font-medium">{formatDate(segment?.departure?.at)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Departure Time</p>
                        <p className="font-medium">{new Date(segment?.departure?.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Confirmation</p>
                        <p className="font-mono text-xs">{confirmationId || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* --- 3. UPDATED STUB SECTION --- */}
            {/* Now wrapped in a <Link> to be clickable */}
            <Link href={`/flight/confirmation/${encodeURIComponent(confirmationId)}`} className="group">
                <div className="bg-black/20 p-6 md:border-l-2 md:border-dashed border-white/30 flex flex-col items-center justify-center min-w-[150px] h-full cursor-pointer transition-colors duration-300 group-hover:bg-cyan-500/20">
                    <TicketIcon />
                    <p className="text-xs text-slate-300 mt-2 text-center">View Ticket</p>
                </div>
            </Link>
        </div>
    );
};

// --- Keycard Style Component for Hotels ---
const HotelBookingCard = ({ booking }) => {
    const hotel = booking.amadeusResponse?.data?.hotelBookings?.[0]?.hotel;
    const offer = booking.amadeusResponse?.data?.hotelBookings?.[0]?.hotelOffer;
    const guest = booking.guests?.[0];
    const confirmationId = booking.amadeusResponse?.data?.id;

    // --- 4. WRAP THE ENTIRE CARD IN A LINK ---
    return (
        <Link href={`/hotel/confirmation/${confirmationId}`} className="group block">
             <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg overflow-hidden my-4 p-6 transition-transform duration-300 group-hover:scale-[1.02] group-hover:border-yellow-400/50">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <p className="text-sm text-slate-300">Hotel Keycard</p>
                        <h3 className="text-2xl font-bold text-white mb-1">{hotel?.name || 'Hotel Name Not Found'}</h3>
                        <p className="text-slate-400 text-sm">{hotel?.contact?.address?.lines?.[0]}, {hotel?.contact?.address?.cityName}</p>
                    </div>
                    <div className="bg-yellow-500/10 p-4 rounded-full transition-transform duration-300 group-hover:scale-110">
                       <KeyIcon />
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-white border-t border-white/20 pt-4">
                    <div>
                        <p className="text-xs text-slate-400">Guest</p>
                        <p className="font-medium">{guest?.firstName} {guest?.lastName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Check-In</p>
                        <p className="font-medium">{formatDate(offer?.checkInDate)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Check-Out</p>
                        <p className="font-medium">{formatDate(offer?.checkOutDate)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Confirmation</p>
                        <p className="font-mono text-xs">{confirmationId || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </Link>
    );
};


// --- Main Component to Fetch and Display Data (NO CHANGES HERE) ---
function BookingsDisplay() {
    // ... (This entire component remains unchanged)
    const [user, setUser] = useState(null);
    const [flights, setFlights] = useState([]);
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchBookings = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch Flights
                const flightQuery = query(collection(db, "userProfiles", user.uid, "bookings"));
                const flightSnapshot = await getDocs(flightQuery);
                const flightData = flightSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFlights(flightData);

                // Fetch Hotels
                const hotelQuery = query(collection(db, "userProfiles", user.uid, "hotelBookings"));
                const hotelSnapshot = await getDocs(hotelQuery);
                const hotelData = hotelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHotels(hotelData);

            } catch (err) {
                console.error("Failed to fetch bookings:", err);
                setError("Could not load your bookings. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [user]);

    const buttonStyles = "flex items-center justify-center bg-black/20 backdrop-blur-xl border border-white/20 rounded-lg shadow-lg px-6 py-3 text-white font-semibold hover:bg-white/10 transition-colors duration-300";

    return (
        <div className="min-h-screen font-inter text-white">
            <div 
                className="fixed inset-0 -z-10 bg-cover bg-center"
                style={{ backgroundImage: "url('/assets/bookings.avif')" }}
            >
                <div className="absolute inset-0 bg-black/40"></div>
            </div>
            
            <NavigationBarDark />

            <main className="container mx-auto p-4 md:p-8">
                <h1 className="text-4xl font-extrabold text-center mb-8 text-shadow-lg">My Bookings</h1>

                <div className="flex justify-center gap-4 mb-12">
                    <a href="/flight/search" className={buttonStyles}>
                        <PlusCircleIcon />
                        Book a New Flight
                    </a>
                    <a href="/hotel/search" className={buttonStyles}>
                        <PlusCircleIcon />
                        Book a New Hotel
                    </a>
                </div>

                {loading && <p className="text-center">Loading your bookings...</p>}
                {error && <p className="text-center text-red-400">{error}</p>}
                {!loading && !user && <p className="text-center">Please sign in to see your bookings.</p>}
                
                {!loading && user && (
                    <>
                        <section className="mb-16">
                            <h2 className="text-3xl font-bold mb-4 border-b-2 border-cyan-400 pb-2 flex items-center"><PlaneIcon /> My Flights</h2>
                            {flights.length > 0 ? (
                                flights.map(booking => <FlightBookingCard key={booking.id} booking={booking} />)
                            ) : (
                                <div className="bg-black/20 backdrop-blur-xl p-8 rounded-2xl text-center text-slate-300">
                                    <p>You have no flights booked yet. Time for an adventure!</p>
                                </div>
                            )}
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold mb-4 border-b-2 border-yellow-400 pb-2 flex items-center"><HotelIcon /> My Hotel Stays</h2>
                            {hotels.length > 0 ? (
                                hotels.map(booking => <HotelBookingCard key={booking.id} booking={booking} />)
                            ) : (
                                <div className="bg-black/20 backdrop-blur-xl p-8 rounded-2xl text-center text-slate-300">
                                    <p>You haven't booked any hotels. Ready to find your home away from home?</p>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

// --- Page Export with Suspense (NO CHANGES HERE) ---
export default function MyBookingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Page...</div>}>
            <BookingsDisplay />
        </Suspense>
    );
}