'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavigationBarDark from '@/components/NavigationBarDark';

// --- Icon Components ---
const HotelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1m-1-4h1m-1 4h1" /></svg>;
const BedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

// --- Main Page Component ---
export default function HotelListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hotelList, setHotelList] = useState([]);
    const [expandedHotelId, setExpandedHotelId] = useState(null);
    // --- FIX: Use the passed cityName, with a fallback to the cityCode ---
    const [cityName, setCityName] = useState(searchParams.get('cityName') || searchParams.get('cityCode'));

    useEffect(() => {
        const cityCode = searchParams.get('cityCode');
        if (cityCode) {
            handleFetchHotelList();
        } else {
            setError("Missing city information. Please return to the search page.");
            setLoading(false);
        }
    }, [searchParams]);

    const handleFetchHotelList = async () => {
        setLoading(true);
        setError('');
        setHotelList([]);
        try {
            const queryParams = new URLSearchParams(searchParams).toString();
            const response = await fetch(`/api/hotels/list?${queryParams}`);
            const data = await response.json();
            if (response.ok) {
                setHotelList(data);
                if (data.length === 0) setError(`No hotels found matching your criteria.`);
            } else {
                setError(data.error || 'Failed to fetch the hotel list.');
            }
        } catch (err) {
            setError(`A network error occurred: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen font-inter">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/hotellist.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/40"></div>
            
            <NavigationBarDark />
            <div className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-black/20 backdrop-blur-md rounded-xl shadow-lg p-6 mb-8 border border-white/20">
                        <h1 className="text-3xl font-bold text-white">Hotels in {cityName}</h1>
                        <p className="text-slate-200 mt-2">Showing hotels matching your search. Check availability to see rooms and prices.</p>
                    </div>
                    {loading && <div className="flex flex-col items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-cyan-500 mb-4"></div><p className="text-slate-100 font-semibold">Searching for matching hotels...</p></div>}
                    {error && !loading && <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-md"><p className="text-red-600 font-semibold">{error}</p><button onClick={() => router.push('/hotel/search')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Go Back to Search</button></div>}
                    
                    {!loading && hotelList.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {hotelList.map((hotel) => (
                                <HotelCard 
                                    key={hotel.hotelId} 
                                    hotel={hotel} 
                                    searchParams={searchParams}
                                    isExpanded={expandedHotelId === hotel.hotelId}
                                    onExpand={setExpandedHotelId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Hotel Card Component ---
function HotelCard({ hotel, searchParams, isExpanded, onExpand }) {
    const router = useRouter();
    const [status, setStatus] = useState('idle');
    const [offers, setOffers] = useState([]);

    const handleCheckAvailability = async () => {
        setStatus('loading');
        setOffers([]);
        try {
            const queryParams = new URLSearchParams(searchParams);
            queryParams.set('hotelId', hotel.hotelId);
            const response = await fetch(`/api/hotels/offers?${queryParams.toString()}`);
            const data = await response.json();
            if (response.ok && data.length > 0) {
                setOffers(data);
                onExpand(hotel.hotelId);
                setStatus('idle');
            } else {
                setStatus('unavailable');
            }
        } catch (err) {
            setStatus('unavailable');
        }
    };
    
    const handleInitiateBooking = (offerId) => {
        const cityName = searchParams.get('cityName') || hotel.address?.cityName;
        router.push(`/hotel/book?offerId=${offerId}&hotelName=${encodeURIComponent(hotel.name)}&cityName=${encodeURIComponent(cityName)}`);
    };

    const renderButton = () => {
        switch (status) {
            case 'loading': return <button disabled className="w-full px-5 py-3 bg-slate-400 text-white font-semibold rounded-lg">Checking...</button>;
            case 'unavailable': return <p className="px-5 py-3 bg-red-100 text-red-700 font-semibold rounded-lg text-center">Sold Out</p>;
            default: return <button onClick={handleCheckAvailability} className="w-full px-5 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700">Check Availability</button>;
        }
    };

    return (
        <div className={`bg-black/20 backdrop-blur-md rounded-xl shadow-lg border border-white/20 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'md:col-span-2 lg:col-span-4' : ''}`}>
            <div className="flex flex-col p-6 min-h-[220px]">
                <div className="flex-grow">
                    <div className="flex items-start">
                        <div className="pr-4 pt-1"><HotelIcon /></div>
                        <div className="flex-grow">
                            <h2 className="text-lg font-bold text-slate-100">{hotel.name}</h2>
                            <p className="text-sm text-slate-200 mt-1">{hotel.address?.cityName || 'City not available'}</p>
                        </div>
                    </div>
                </div>
                <div className="pt-4">
                    {isExpanded ? <button onClick={() => onExpand(null)} className="w-full px-5 py-3 bg-white/20 text-slate-100 font-semibold rounded-lg hover:bg-white/30">Hide Offers</button> : renderButton()}
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 md:p-6 border-t border-white/20 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:border-r border-white/20 lg:pr-6">
                         <h3 className="font-bold text-lg text-slate-300 mb-4">Hotel Information</h3>
                         <p className="text-sm text-slate-200">More hotel details would be displayed here, such as a description, rating, or a list of its main amenities, if available from the API.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-300 mb-4">Available Rooms</h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {offers.map(offer => <OfferCard key={offer.offerId} offer={offer} onBook={() => handleInitiateBooking(offer.offerId)} />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Offer Card Component ---
function OfferCard({ offer, onBook }) {
    return (
        <div className="bg-black/20 backdrop-blur-md rounded-xl shadow-lg border border-white/20 overflow-hidden">
            <div className="flex flex-col md:flex-row">
                <div className="flex-grow p-4">
                    <h4 className="font-bold text-blue-200 capitalize">{(offer.category && offer.category !== 'N/A') ? offer.category.replace(/_/g, ' ').toLowerCase() : 'Standard Room'}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                        <div className="flex items-center gap-2"><UsersIcon /><span>{offer.guests || 1} Guests</span></div>
                        <div className="flex items-center gap-2"><BedIcon /><span>{offer.beds || 1} {offer.bedType ? offer.bedType.toLowerCase() : 'bed'}</span></div>
                    </div>
                </div>
                <div className="p-4 w-full md:w-48 flex flex-col justify-center items-center text-center border-t border-white/20 md:border-t-0 md:border-l">
                    <div>
                        <p className="text-sm text-slate-200">Total Price</p>
                        <p className="text-2xl font-bold text-slate-100">{offer.priceBDT || 'N/A'}</p>
                    </div>
                    <button onClick={onBook} className="mt-2 w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Select</button>
                </div>
            </div>
        </div>
    );
}
