'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Icon Components ---
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default function HotelBookingConfirmationPage() {
    const router = useRouter();
    const [bookingData, setBookingData] = useState(null);

    useEffect(() => {
        const dataString = sessionStorage.getItem('bookingConfirmationData');
        if (dataString) {
            try {
                setBookingData(JSON.parse(dataString));
                sessionStorage.removeItem('bookingConfirmationData');
            } catch (e) {
                console.error("Failed to parse booking data from sessionStorage", e);
            }
        }
    }, []);

    if (!bookingData) {
        return (
            <div className="min-h-screen font-inter flex items-center justify-center bg-gradient-to-br from-cyan-900 via-blue-900 to-black">
                <p className="text-white text-xl">Loading booking details...</p>
            </div>
        );
    }

    const { data } = bookingData;
    const booking = data?.hotelBookings?.[0];
    const guest = data?.guests?.[0];
    const offer = booking?.hotelOffer;
    const bookingRef = data?.associatedRecords?.[0]?.reference;

    return (
        <Suspense>
        <div className="min-h-screen font-inter">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-cyan-900 via-blue-900 to-black"></div>
            <NavigationBarDark />
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <div className="bg-black/20 backdrop-blur-xl rounded-xl shadow-lg p-8 text-center border border-white/20">
                    <div className="flex justify-center"><CheckCircleIcon /></div>
                    <h1 className="text-3xl font-bold text-white mt-4">Booking Confirmed!</h1>
                    <p className="text-slate-300 mt-2">Your stay has been successfully booked. Your booking reference is:</p>
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
                            {/* --- FIX: Display BDT Price --- */}
                            <p><strong>Total Price:</strong> 
                                {offer?.price?.totalBDT ? 
                                    <span> {offer.price.totalBDT} BDT <span className="text-slate-400 text-sm">({offer.price.total} {offer.price.currency})</span></span> :
                                    <span> {offer?.price?.total} {offer?.price?.currency}</span>
                                }
                            </p>
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
                 <div className="mt-8 text-center">
                    <button onClick={() => router.push('/hotel/search')} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600">
                        Book Another Stay
                    </button>
                </div>
            </div>
        </div>
        </Suspense>
    );
}
