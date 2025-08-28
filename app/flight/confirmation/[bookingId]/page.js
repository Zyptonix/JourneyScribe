'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
// 1. Import auth and onAuthStateChanged
import { db, auth } from '@/lib/firebaseClient'; 
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Icon Components ---
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;

// --- Helper Functions ---
const formatDate = (dateTime) => new Date(dateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (dateTime) => new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });


// --- Main Flight Confirmation Page Component ---
export default function FlightConfirmationPage() {
    const { bookingId } = useParams();
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // 2. Add state for user and auth status
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // 3. Add a useEffect to handle authentication
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 4. Update the data fetching useEffect
    useEffect(() => {
        // Don't fetch until auth is checked and we have an ID
        if (authLoading || !bookingId) {
            return;
        }

        const fetchFlightBooking = async () => {
            setLoading(true);
            setError('');
            
            const decodedBookingId = decodeURIComponent(bookingId);

            // 5. Check if a user is logged in
            if (!user) {
                setError("Please sign in to view your flight booking.");
                setLoading(false);
                return;
            }

            try {
                // 6. Construct the correct path using the user's UID
                const docRef = doc(db, 'userProfiles', user.uid, 'bookings', decodedBookingId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setBookingData(docSnap.data());
                } else {
                    // Also check the public collection as a fallback for older/guest bookings
                    const publicDocRef = doc(db, 'flightBookings', decodedBookingId);
                    const publicDocSnap = await getDoc(publicDocRef);
                    if (publicDocSnap.exists()) {
                        setBookingData(publicDocSnap.data());
                    } else {
                        setError('Flight booking not found in your profile.');
                    }
                }
            } catch (err) {
                console.error("Error fetching flight booking:", err);
                setError('Failed to load booking details.');
            } finally {
                setLoading(false);
            }
        };

        fetchFlightBooking();
    }, [bookingId, user, authLoading]); // Rerun when auth status changes

    if (loading || authLoading) {
        return (
            <div className="min-h-screen font-inter flex items-center justify-center bg-gradient-to-br from-cyan-900 via-blue-900 to-black">
                <p className="text-white text-xl">Loading booking details...</p>
            </div>
        );
    }

    if (error) {
         return (
            <div className="min-h-screen font-inter flex items-center justify-center bg-gradient-to-br from-red-900 via-gray-900 to-black">
                <p className="text-white text-xl text-center">{error}</p>
            </div>
        );
    }

    if (!bookingData) {
        return null; // Or a "not found" component
    }

    // Extract data for rendering
    const { raw } = bookingData;
    const bookingRef = raw.data.associatedRecords[0].reference;
    const flightOffer = raw.data.flightOffers[0];

    return (
        <Suspense>
            <div className="min-h-screen font-inter">
                <div className="fixed inset-0 -z-10 bg-gradient-to-br from-cyan-900 via-blue-900 to-black"></div>
                <NavigationBarDark />
                
                <div className="p-4 md:p-8 max-w-4xl mx-auto">
                    <div className="bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center border border-white/20">
        
                        <h1 className="text-3xl font-bold text-white mt-4">Booking Information!</h1>
                        <p className="text-slate-300 mt-2">Your booking reference is:</p>
                        <p className="text-4xl font-extrabold text-cyan-300 mt-4 bg-black/20 inline-block px-6 py-2 rounded-lg border border-white/20">{bookingRef}</p>
                    </div>

                    <div className="mt-8 bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-6">Traveler Information</h2>
                        <div className="space-y-4">
                            {raw.data.travelers.map(traveler => (
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
            </div>
        </Suspense>
    );
}
