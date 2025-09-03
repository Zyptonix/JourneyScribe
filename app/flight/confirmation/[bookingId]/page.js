'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient'; 
import { onAuthStateChanged } from 'firebase/auth';
import NavigationBar from '@/components/NavigationBar';

// --- Icon and Helper Components remain the same ---
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const formatDate = (dateTime) => new Date(dateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (dateTime) => new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// --- Presentational UI Component with logging ---
function FlightConfirmationUI({ data: rawData }) { // Renamed prop for clarity
    console.log("🎨 [FlightConfirmationUI] Received rawData prop:", rawData);

    // FIX: Access properties inside the nested 'data' object
    const bookingData = rawData?.data;

    const bookingRef = bookingData?.associatedRecords?.[0]?.reference ?? 'Not Available';
    const flightOffer = bookingData?.flightOffers?.[0];
    
    console.log("... [FlightConfirmationUI] Extracted bookingRef:", bookingRef);
    console.log("... [FlightConfirmationUI] Extracted flightOffer:", flightOffer);

    if (!flightOffer) {
        // This message will no longer appear
        console.warn("... [FlightConfirmationUI] flightOffer is missing. Rendering 'Incomplete Data' message.");
        return (
            <div className="p-8 max-w-4xl mx-auto text-center bg-white/60 rounded-xl">
                <h1 className="text-2xl font-bold text-red-600">Booking Data Incomplete</h1>
                <p className="text-slate-700 mt-2">Could not display flight itinerary because the necessary details are missing from the booking record.</p>
            </div>
        );
    }
    
    // Also update the map function to use the nested data
    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center border border-white/20">
                <div className="flex justify-center"><CheckCircleIcon /></div>
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Booking Confirmed!</h1>
                <p className="text-slate-600 mt-2">Your flight has been successfully booked. Your booking reference is:</p>
                <p className="text-4xl font-extrabold text-blue-600 mt-4 bg-blue-50/30 inline-block px-6 py-2 rounded-lg border border-blue-200">{bookingRef}</p>
            </div>
            
            <div className="mt-8 bg-white/60 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Traveler Information</h2>
                <div className="space-y-4">
                    {/* FIX: Use bookingData.travelers */}
                    {bookingData.travelers.map(traveler => (
                        <div key={traveler.id} className="flex items-center gap-4 p-4 bg-slate-50/30 rounded-lg border border-slate-200">
                            <UserIcon />
                            <div>
                                <p className="font-semibold text-slate-700">{traveler.name.firstName} {traveler.name.lastName}</p>
                                <p className="text-sm text-slate-500">{traveler.contact.emailAddress}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 bg-white/60 backdrop-blur-xl rounded-xl shadow-lg p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Flight Itinerary</h2>
                <div className="space-y-6">
                    {flightOffer.itineraries.map((itinerary, index) => (
                        <div key={index}>
                            <h3 className="text-lg font-semibold text-slate-700 mb-3">{index === 0 ? 'Outbound Flight' : 'Return Flight'}</h3>
                            {itinerary.segments.map((segment) => (
                                <div key={segment.id} className="relative pl-8 border-l-2 border-slate-200 pb-6 last:pb-0">
                                    <div className="absolute -left-4 top-1 h-8 w-8 bg-white rounded-full flex items-center justify-center border-2 border-slate-200"><PlaneIcon /></div>
                                    <p className="font-bold text-slate-800">{formatDate(segment.departure.at)}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-slate-600">{formatTime(segment.departure.at)} - {segment.departure.iataCode}</p>
                                        <p className="text-slate-500 text-sm">{segment.duration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}</p>
                                        <p className="text-slate-600">{formatTime(segment.arrival.at)} - {segment.arrival.iataCode}</p>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Carrier: {segment.carrierCode} {segment.number}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Main Page Component with logging ---
export default function FlightConfirmationPage() {
    const { bookingId } = useParams();
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        console.log("🔒 [AUTH] Setting up auth state listener.");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log("🔒 [AUTH] Auth state changed. User is:", currentUser ? currentUser.uid : "Not logged in");
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        console.log("🕵️‍♂️ [FETCH] useEffect triggered. Checking conditions...");
        console.log(`... Auth loading: ${authLoading}, Booking ID: ${bookingId}`);

        if (authLoading || !bookingId) {
            console.log("... [FETCH] Conditions not met. Aborting fetch.");
            return;
        }

        const fetchFlightBooking = async () => {
            setLoading(true);
            setError('');
            const decodedBookingId = decodeURIComponent(bookingId);
            console.log(`... [FETCH] Starting fetch for bookingId: ${decodedBookingId}`);

            if (!user) {
                console.warn("... [FETCH] No user logged in. Setting error.");
                setError("Please sign in to view your flight booking.");
                setLoading(false);
                return;
            }

            try {
                const docPath = `userProfiles/${user.uid}/flightBookings/${decodedBookingId}`;
                console.log(`... [FETCH] Attempting to get doc from Firestore at path: ${docPath}`);
                const docRef = doc(db, 'userProfiles', user.uid, 'flightBookings', decodedBookingId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    console.log("✅ [FETCH] Document found in user's profile!");
                    // MOST IMPORTANT LOG: See what data is actually in Firestore
                    console.log("📄 [FETCH] Raw Firestore Data:", JSON.stringify(docSnap.data(), null, 2));
                    setBookingData(docSnap.data());
                } else {
                    console.warn("... [FETCH] Document not found in user's profile. Checking public collection as fallback...");
                    const publicDocRef = doc(db, 'flightBookings', decodedBookingId);
                    const publicDocSnap = await getDoc(publicDocRef);
                    if (publicDocSnap.exists()) {
                         console.log("✅ [FETCH] Document found in public collection!");
                         console.log("📄 [FETCH] Raw Firestore Data (from public):", JSON.stringify(publicDocSnap.data(), null, 2));
                         setBookingData(publicDocSnap.data());
                    } else {
                        console.error("❌ [FETCH] Document not found anywhere. Setting error.");
                        setError('Flight booking not found in your profile.');
                    }
                }
            } catch (err) {
                console.error("🔴 [FETCH] An error occurred during fetch:", err);
                setError('Failed to load booking details.');
            } finally {
                setLoading(false);
            }
        };

        fetchFlightBooking();
    }, [bookingId, user, authLoading]);

    console.log("🖼️ [RENDER] Page is rendering with state:", { loading, authLoading, error, hasBookingData: !!bookingData });

    // Main render logic
    return (
        <Suspense>
            <div className="min-h-screen font-inter">
                <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/flight.jpg')" }}></div>
                <div className="fixed inset-0 -z-10 bg-white/30"></div>
                <NavigationBar />
                
                {(loading || authLoading) && (
                    <div className="flex h-screen items-center justify-center">
                        <p className="text-slate-700 text-xl">Loading booking details...</p>
                    </div>
                )}
                {error && (
                    <div className="flex h-screen items-center justify-center">
                        <p className="text-red-600 bg-white/50 p-4 rounded-lg text-xl text-center">{error}</p>
                    </div>
                )}
                {!loading && !error && bookingData && (
                    <>
                        {console.log("➡️ [RENDER] Passing this 'raw' data to FlightConfirmationUI:", bookingData.raw)}
                        <FlightConfirmationUI data={bookingData.raw} />
                    </>
                )}
            </div>
        </Suspense>
    );
}