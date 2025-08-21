'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavigationBarLight from '@/components/NavigationBarLight';

// --- Icon Components for a richer UI ---
const BedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PolicyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.417l5.5-5.5a1 1 0 011.414 0l5.5 5.5a12.02 12.02 0 008.618-14.472z" /></svg>;


export default function HotelOffersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // --- State Management ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [offers, setOffers] = useState([]);

    // --- Effect to Fetch Data ---
    useEffect(() => {
        const hotelId = searchParams.get('hotelId');
        if (hotelId) {
            fetchOffers();
        } else {
            setError("Missing hotel ID. Please return to the previous page.");
            setLoading(false);
        }
    }, [searchParams]);

    // --- Data Fetching Logic ---
    const fetchOffers = async () => {
        setLoading(true);
        setError('');
        setOffers([]);
        try {
            const queryParams = new URLSearchParams(searchParams).toString();
            const response = await fetch(`/api/hotels/offers?${queryParams}`);
            const responseData = await response.json();

            if (response.ok) {
                setOffers(responseData);
                if (responseData.length === 0) {
                    setError(`No available offers found for this hotel on the selected dates.`);
                }
            } else {
                setError(responseData.error || 'Failed to fetch offers.');
            }
        } catch (err) {
            setError(`A network error occurred: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Navigation ---
    const handleInitiateBooking = (offerId) => {
        const hotelName = searchParams.get('hotelName');
        router.push(`/hotel/book?offerId=${offerId}&hotelName=${encodeURIComponent(hotelName)}`);
    };

    return (
        <div className="min-h-screen bg-slate-100 font-inter">
            <NavigationBarLight />
            <div className="p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                        <h1 className="text-3xl font-bold text-slate-800">{searchParams.get('hotelName')}</h1>
                        <p className="text-slate-600 mt-2">Showing offers from <strong>{searchParams.get('checkInDate')}</strong> to <strong>{searchParams.get('checkOutDate')}</strong></p>
                    </div>

                    {loading && <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div></div>}
                    {error && !loading && <div className="text-center bg-white p-8 rounded-xl shadow-md"><p className="text-red-600">{error}</p></div>}

                    {!loading && offers.length > 0 && (
                        <div className="space-y-6">
                            {offers.map((offer) => (
                                <OfferCard key={offer.offerId} offer={offer} onBook={() => handleInitiateBooking(offer.offerId)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Detailed Offer Card Component ---
function OfferCard({ offer, onBook }) {
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <div className="flex flex-col md:flex-row">
                {/* Main Details Section */}
                <div className="flex-grow p-6">
                    <h2 className="text-xl font-bold text-blue-800 capitalize">
                        {offer.category ? offer.category.replace(/_/g, ' ').toLowerCase() : 'Standard Room'}
                    </h2>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2"><UsersIcon /><span>Up to {offer.guests || 1} Guests</span></div>
                        <div className="flex items-center gap-2"><BedIcon /><span>{offer.beds || 1} {offer.bedType ? offer.bedType.toLowerCase() : 'bed'}</span></div>
                    </div>

                    {offer.roomDescription && offer.roomDescription !== 'N/A' && (
                        <p className="text-sm text-slate-500 mt-4 border-t pt-4 whitespace-pre-line">
                            {offer.roomDescription}
                        </p>
                    )}
                </div>

                {/* Policies Section */}
                <div className="p-6 border-t md:border-t-0 md:border-l border-slate-200 w-full md:w-64 flex-shrink-0">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><PolicyIcon /> Policies</h3>
                    <div className="space-y-2 text-sm text-slate-600">
                        <p><strong>Payment:</strong> <span className="capitalize">{offer.paymentType?.toLowerCase() || 'N/A'}</span></p>
                        <p><strong>Cancellation:</strong> <span className={`font-semibold ${offer.isRefundable ? 'text-green-600' : 'text-red-600'}`}>{offer.cancellationPolicy}</span></p>
                    </div>
                </div>

                {/* Pricing and Booking Section */}
                <div className="bg-slate-50 p-6 w-full md:w-64 flex flex-col justify-center items-center text-center flex-shrink-0">
                    <div>
                        <p className="text-sm text-slate-500">Total Price</p>
                        <p className="text-3xl font-bold text-blue-700">{offer.priceBDT || 'N/A'}</p>
                        <p className="text-xs text-slate-400">({offer.originalPrice || '...'})</p>
                    </div>
                    <button onClick={onBook} className="mt-4 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                        Select and Book
                    </button>
                </div>
            </div>
        </div>
    );
}
