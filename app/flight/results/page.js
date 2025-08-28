'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavigationBar from '@/components/NavigationBar';

// --- Helper Functions & Icons ---
const formatTime = (dateTime) => new Date(dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const formatDuration = (duration) => duration.replace('PT', '').replace('H', 'h ').replace('M', 'm');
const PlaneTakeoffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.8 9.925l.416-.555a1.125 1.125 0 011.569 0l.416.555m3.113 0l.416-.555a1.125 1.125 0 011.569 0l.416.555m0 0l3.113-4.15a.75.75 0 011.16.886l-3.323 4.43z" /></svg>;

// --- Loading component for Suspense fallback ---
const ResultsLoader = () => (
    <div className="min-h-screen font-inter">
        <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/flightresults.jpg')" }}></div>
        <div className="fixed inset-0 -z-10 bg-black/10"></div>
        <NavigationBar/>
        <div className='p-4 md:p-8'>
            <div className="max-w-5xl mx-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-white/20">
                    <div className="animate-pulse flex flex-col space-y-3">
                        <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-cyan-500"></div>
                </div>
            </div>
        </div>
    </div>
);

// --- Component containing the page logic, which uses searchParams ---
function FlightResults() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [flightOffers, setFlightOffers] = useState([]);
    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchFlights = async () => {
            setLoading(true);
            setError('');
            setFlightOffers([]);
            const queryParams = new URLSearchParams(searchParams).toString();
            try {
                const response = await fetch(`/api/flights/search?${queryParams}`);
                const data = await response.json();
                if (response.ok) {
                    setFlightOffers(data);
                    if (data.length === 0) setError("No flights found for your search criteria.");
                } else {
                    setError(data.error || 'Failed to fetch flight offers.');
                }
            } catch (err) {
                setError(`A network error occurred: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchFlights();
    }, [searchParams]);

    const searchSummary = useMemo(() => {
        const adults = searchParams.get('adults') || 0;
        const children = searchParams.get('children') || 0;
        const infants = searchParams.get('infants') || 0;
        const travelClass = searchParams.get('travelClass')?.replace('_', ' ') || 'Economy';
        let passengerSummary = `${adults} Adult${adults > 1 ? 's' : ''}`;
        if (children > 0) passengerSummary += `, ${children} Child${children > 1 ? 'ren' : ''}`;
        if (infants > 0) passengerSummary += `, ${infants} Infant${infants > 1 ? 's' : ''}`;
        return {
            path: `${searchParams.get('origin')} → ${searchParams.get('destination')}`,
            date: searchParams.get('departureDate'),
            passengers: passengerSummary,
            travelClass: travelClass,
        };
    }, [searchParams]);

    return (
        <div className="min-h-screen font-inter">
            <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/assets/flightresults.jpg')" }}></div>
            <div className="fixed inset-0 -z-10 bg-black/10"></div>
            <NavigationBar/>
            <div className='p-4 md:p-8'>
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-white/20">
                        <h1 className="text-3xl font-bold text-slate-800">{searchSummary.path}</h1>
                        <p className="text-slate-600 mt-2 capitalize">{searchSummary.date} | {searchSummary.passengers} | {searchSummary.travelClass}</p>
                    </div>
                    
                    {loading && <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-cyan-500"></div></div>}
                    {error && !loading && <p className="p-4 bg-red-500/50 text-white rounded-lg text-center">{error}</p>}

                    {!loading && flightOffers.length > 0 && (
                        <div className="space-y-8">
                            {flightOffers.map((offer) => (
                                <FlightOfferCard key={offer.id} offer={offer} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Main Page Export ---
// This is the actual page route. It wraps the logic component in Suspense.
export default function FlightResultsPage() {
    return (
        <Suspense fallback={<ResultsLoader />}>
            <FlightResults />
        </Suspense>
    );
}


// --- Sub-components (No changes needed here) ---

function FlightOfferCard({ offer }) {
    const router = useRouter();
    const { price, itineraries } = offer;

    const handleSelectFlight = () => {
        router.push(`/flight/book?offer=${encodeURIComponent(JSON.stringify(offer))}`);
    };

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
            <div className="flex-grow p-6">
                {itineraries?.map((itinerary, index) => (
                    <ItineraryDetails key={index} itinerary={itinerary} isReturn={index > 0} />
                ))}
            </div>
            <div className="bg-slate-50 border-t-2 border-dashed border-slate-300 md:border-t-0 md:border-l-2 p-6 w-full md:w-64 flex flex-col justify-center items-center text-center">
                <div>
                    <p className="text-sm text-slate-500">Total Price</p>
                    {price?.totalBDT ? (
                        <>
                            <p className="text-3xl font-bold text-blue-700">{price.totalBDT} <span className="text-lg font-normal">BDT</span></p>
                            <p className="text-xs text-slate-400">({price.total} {price.currency})</p>
                        </>
                    ) : (
                        <p className="text-3xl font-bold text-blue-700">{price?.total} <span className="text-lg font-normal">{price?.currency}</span></p>
                    )}
                </div>
                <button onClick={handleSelectFlight} className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Select Flight
                </button>
            </div>
        </div>
    );
}

function ItineraryDetails({ itinerary, isReturn }) {
    return (
        <div className="border-b border-slate-200 last:border-b-0 pb-4 last:pb-0 mb-4 last:mb-0">
            <div className="flex justify-between items-center mb-4">
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${isReturn ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                    {isReturn ? 'Return' : 'Outbound'}
                </span>
                <p className="text-sm text-slate-500 font-semibold">{formatDuration(itinerary.duration)}</p>
            </div>
            {itinerary.segments.map((segment, index) => (
                <SegmentDetails key={index} segment={segment} isLast={index === itinerary.segments.length - 1} />
            ))}
        </div>
    );
}

function SegmentDetails({ segment, isLast }) {
    return (
        <>
            <div className="flex items-center">
                <div className="text-center w-20">
                    <p className="font-bold text-lg text-slate-800">{formatTime(segment.departure.at)}</p>
                    <p className="font-semibold text-slate-600">{segment.departure.iataCode}</p>
                </div>
                <div className="flex-grow text-center px-2">
                    <div className="w-full h-px bg-slate-300 relative">
                        <div className="absolute -left-1 -top-1 h-3 w-3 bg-white border-2 border-slate-400 rounded-full"></div>
                        <div className="absolute -right-1 -top-1 h-3 w-3 bg-white border-2 border-slate-400 rounded-full"></div>
                        <div className="absolute left-1/2 -top-2"><PlaneTakeoffIcon /></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{segment.carrierCode} {segment.number}</p>
                </div>
                <div className="text-center w-20">
                    <p className="font-bold text-lg text-slate-800">{formatTime(segment.arrival.at)}</p>
                    <p className="font-semibold text-slate-600">{segment.arrival.iataCode}</p>
                </div>
            </div>
            {!isLast && (
                <div className="text-center my-2">
                    <p className="text-xs font-semibold text-cyan-700 bg-cyan-100 inline-block px-2 py-1 rounded-full">
                        Layover: {segment.arrival.iataCode}
                    </p>
                </div>
            )}
        </>
    );
}