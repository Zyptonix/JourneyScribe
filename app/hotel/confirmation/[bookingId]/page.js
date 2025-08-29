'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient'; 
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Icon Components (no changes) ---
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;


// --- Main Confirmation Page Component ---
export default function ConfirmationPage() {
    const { bookingId } = useParams();
    const [bookingData, setBookingData] = useState(null);
    const [error, setError] = useState('');
    
    // 1. Create separate state for the user and auth loading status
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // 2. First useEffect: Manages authentication state ONLY
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false); // Mark that the initial auth check is complete
        });
        
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []); // Empty dependency array means this runs only once on mount

    // 3. Second useEffect: Manages data fetching ONLY
    useEffect(() => {
        // Don't do anything until we have the bookingId and auth is no longer loading
         if (authLoading || !bookingId) {
            return;
        }

        const fetchBooking = async () => {
            setError('');
            setBookingData(null);
            
            // 1. Decode the bookingId from the URL parameter
            const decodedBookingId = decodeURIComponent(bookingId);

            try {
                if (user) {
                    console.log("--- Firestore Query Details ---");
                    console.log("Attempting to fetch with UID:", user.uid);
                    // Use the decoded ID in your logs and query
                    console.log("Attempting to fetch with Decoded Booking ID:", decodedBookingId); 

                    const hotelDocRef = doc(db, 'userProfiles', user.uid, 'hotelBookings', decodedBookingId); // Use decoded ID
                    const hotelDocSnap = await getDoc(hotelDocRef);

                    console.log("Firestore snapshot received:", hotelDocSnap);

                    if (hotelDocSnap.exists()) {
                        console.log("Document exists. Data:", hotelDocSnap.data());
                        const rawData = hotelDocSnap.data();
                        setBookingData({
                            data: rawData.amadeusResponse.data,
                            guests: rawData.guests,
                            createdAt: rawData.createdAt,
                        });
                    } else {
                        console.log("Document does not exist at the specified path.");
                        setError('Booking not found in your profile.');
                    }
                } else {
                    setError('Please sign in to view this hotel booking.');
                }
            } catch (err) {
                console.error("Error fetching booking:", err);
                setError('Failed to load booking details.');
            }
        };


        fetchBooking();
    }, [bookingId, user, authLoading]); // Re-run this effect if any of these change

    // Show a loading screen while auth is being checked or data is being fetched
    if (authLoading || (!bookingData && !error)) {
        return (
            <div className="min-h-screen font-inter flex items-center justify-center bg-gradient-to-br from-cyan-900 via-blue-900 to-black">
                <p className="text-white text-xl">Loading booking details...</p>
            </div>
        );
    }
    
    // --- The rest of your component remains the same ---

    if (error) {
         return (
            <div className="min-h-screen font-inter flex items-center justify-center bg-gradient-to-br from-red-900 via-gray-900 to-black">
                <p className="text-white text-xl text-center">{error}</p>
            </div>
        );
    }

    const isFlight = bookingData?.data?.flightOffers;
    const isHotel = bookingData?.data?.hotelBookings;

    return (
        <Suspense>
            <div className="min-h-screen font-inter">
                <div className="fixed inset-0 -z-10 bg-gradient-to-br from-cyan-900 via-blue-900 to-black"></div>
                <NavigationBarDark />
                {bookingData && (
                    <>
                        {isFlight && <FlightConfirmationDetails bookingData={bookingData} />}
                        {isHotel && <HotelConfirmationDetails bookingData={bookingData} />}
                    </>
                )}
            </div>
        </Suspense>
    );
}
// --- Component to display HOTEL details (no changes) ---
function HotelConfirmationDetails({ bookingData }) {
    // ... same as before
    const { data } = bookingData;
    const booking = data?.hotelBookings?.[0];
    const guest = bookingData?.guests?.[0] || data?.guests?.[0]; // Check both root and nested guests
    const offer = booking?.hotelOffer;
    const bookingRef = data?.id; // Hotel booking ref is on the data object id

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center border border-white/20">
                
                <h1 className="text-3xl font-bold text-white mt-4">Booking Information!</h1>
                <p className="text-slate-300 mt-2">Your booking reference is:</p>
                <p className="text-4xl font-extrabold text-cyan-300 mt-4 bg-black/20 inline-block px-6 py-2 rounded-lg border border-white/20">{bookingRef || 'N/A'}</p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/20">
                    <h2 className="text-2xl font-bold text-white mb-4">Stay Details</h2>
                    <div className="space-y-3 text-slate-200">
                        <p><strong>Hotel:</strong> {booking?.hotel?.name || 'N/A'}</p>
                        <p><strong>Check-in:</strong> {offer?.checkInDate || 'N/A'}</p>
                        <p><strong>Check-out:</strong> {offer?.checkOutDate || 'N/A'}</p>
                        <p><strong>Room:</strong> {offer?.room?.description?.text || 'N/A'}</p>
                        <p><strong>Total Price:</strong> {offer?.price?.total} {offer?.price?.currency}</p>
                    </div>
                </div>
                <div className="bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/20">
                    <h2 className="text-2xl font-bold text-white mb-4">Guest Information</h2>
                    <div className="space-y-3 text-slate-200">
                        <p><strong>Name:</strong> {guest?.firstName} {guest?.lastName}</p>
                        <p><strong>Email:</strong> {guest?.email}</p>
                        <p><strong>Phone:</strong> {guest?.phone}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Component to display FLIGHT details (no changes) ---
function FlightConfirmationDetails({ bookingData }) {
    // ... same as before
    const { data } = bookingData;
    const bookingRef = data.associatedRecords[0].reference;
    const flightOffer = data.flightOffers[0];
    const formatDate = (dateTime) => new Date(dateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formatTime = (dateTime) => new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
             <div className="bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center border border-white/20">
                <div className="flex justify-center"><CheckCircleIcon /></div>
                <h1 className="text-3xl font-bold text-white mt-4">Booking Confirmed!</h1>
                <p className="text-slate-300 mt-2">Your flight has been successfully booked. Your booking reference is:</p>
                <p className="text-4xl font-extrabold text-cyan-300 mt-4 bg-black/20 inline-block px-6 py-2 rounded-lg border border-white/20">{bookingRef}</p>
            </div>

            <div className="mt-8 bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Traveler Information</h2>
                <div className="space-y-4">
                    {data.travelers.map(traveler => (
                        <div key={traveler.id} className="flex items-center gap-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
                            <UserIcon />
                            <div>
                                <p className="font-semibold text-slate-100">{traveler.name.firstName} {traveler.name.lastName}</p>
                                <p className="text-sm text-slate-400">{traveler.contact.emailAddress}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Flight Itinerary</h2>
                <div className="space-y-6">
                    {flightOffer.itineraries.map((itinerary, index) => (
                        <div key={index}>
                            <h3 className="text-lg font-semibold text-slate-200 mb-3">{index === 0 ? 'Outbound Flight' : 'Return Flight'}</h3>
                            {itinerary.segments.map((segment) => (
                                <div key={segment.id} className="relative pl-8 border-l-2 border-slate-600 pb-6 last:pb-0">
                                    <div className="absolute -left-4 top-1 h-8 w-8 bg-gray-800 rounded-full flex items-center justify-center border-2 border-slate-600"><PlaneIcon /></div>
                                    <p className="font-bold text-slate-100">{formatDate(segment.departure.at)}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-slate-300">{formatTime(segment.departure.at)} - {segment.departure.iataCode}</p>
                                        <p className="text-slate-400 text-sm">{segment.duration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}</p>
                                        <p className="text-slate-300">{formatTime(segment.arrival.at)} - {segment.arrival.iataCode}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Carrier: {segment.carrierCode} {segment.number}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}