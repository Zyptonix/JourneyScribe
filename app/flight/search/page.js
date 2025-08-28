'use client';
import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavigationBar from '@/components/NavigationBar';
import CitySearchLight from '@/components/CitySearchLight';

// --- Icon Components ---
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

export default function FlightSearchPage() {
    const router = useRouter();
    const getTodayString = () => new Date().toISOString().split('T')[0];

    // --- State Management ---
    const [origin, setOrigin] = useState('DAC');
    const [originQuery, setOriginQuery] = useState('Dhaka (DAC)');
    const [destination, setDestination] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [departureDate, setDepartureDate] = useState(getTodayString());
    const [returnDate, setReturnDate] = useState('');
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [infants, setInfants] = useState(0);
    const [travelClass, setTravelClass] = useState('ECONOMY');
    const [nonstop, setNonstop] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const popularDestinations = [{ name: "Cox's Bazar", iata: 'CXB' }, { name: 'Kolkata', iata: 'CCU' }, { name: 'Bangkok', iata: 'BKK' }, { name: 'Singapore', iata: 'SIN' }, { name: 'Dubai', iata: 'DXB' }];
    const numberOptions = (max, start = 0) => Array.from({ length: max - start + 1 }, (_, i) => start + i);

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const params = { origin, destination, departureDate, adults: adults.toString(), children: children.toString(), infants: infants.toString(), travelClass, nonstop: nonstop.toString() };
        if (returnDate) params.returnDate = returnDate;
        router.push(`/flight/results?${new URLSearchParams(params).toString()}`);
    };

    const handlePopularDestinationClick = (dest) => {
        setDestination(dest.iata);
        setDestinationQuery(`${dest.name} (${dest.iata})`);
    };
    
    // --- STYLES FOR LIGHT THEME ---
    const inputStyles = "bg-white/80 text-black placeholder-slate-400 p-3 pl-10 border border-slate-300 rounded-lg w-full focus:ring-cyan-500 focus:border-cyan-500";
    const selectStyles = "bg-white/80 text-black p-3 border border-slate-300 rounded-lg w-full";

    return (
        <Suspense>
        <div className="min-h-screen font-inter flex flex-col">
            <div className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/flight.jpg')" }}></div>
            <div className='bg-black/20 fixed inset-0 -z-10'></div>
            <NavigationBar />
            <div className='flex-grow flex items-center justify-center p-4'>
                <div className="w-full max-w-4xl bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    <h1 className="text-4xl font-extrabold text-center text-slate-700 mb-6">Find Your Perfect Flight ✈️</h1>
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CitySearchLight placeholder="Origin" value={originQuery} onQueryChange={setOriginQuery} onCitySelect={setOrigin} required />
                            <CitySearchLight placeholder="Destination" value={destinationQuery} onQueryChange={setDestinationQuery} onCitySelect={setDestination} required />
                            <div>
                                <label htmlFor="departureDate" className="block text-sm font-medium text-slate-700 mb-1">Departure Date</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-3.5"><CalendarIcon /></div>
                                    <input id="departureDate" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className={inputStyles} required />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="returnDate" className="block text-sm font-medium text-slate-700 mb-1">Return (Optional)</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-3.5"><CalendarIcon /></div>
                                    <input id="returnDate" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={departureDate} className={inputStyles} />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-sm text-slate-600">Popular Destinations:</span>
                            {popularDestinations.map(dest => <button key={dest.iata} type="button" onClick={() => handlePopularDestinationClick(dest)} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-semibold hover:bg-cyan-100">{dest.name}</button>)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Adults</label><select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={selectStyles}>{numberOptions(9, 1).map(n => <option key={n}>{n}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Children</label><select value={children} onChange={(e) => setChildren(Number(e.target.value))} className={selectStyles}>{numberOptions(8).map(n => <option key={n}>{n}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Infants</label><select value={infants} onChange={(e) => setInfants(Number(e.target.value))} className={selectStyles}>{numberOptions(8).map(n => <option key={n}>{n}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Class</label><select value={travelClass} onChange={(e) => setTravelClass(e.target.value)} className={selectStyles}><option value="ECONOMY">Economy</option><option value="PREMIUM_ECONOMY">Premium Economy</option><option value="BUSINESS">Business</option><option value="FIRST">First</option></select></div>
                        </div>
                        <div className="flex items-center justify-center pt-2">
                            <label htmlFor="nonstop" className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" id="nonstop" className="sr-only" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} />
                                    <div className="block bg-slate-300 w-14 h-8 rounded-full"></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${nonstop ? 'translate-x-6 bg-cyan-500' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-slate-800 font-medium">Nonstop flights only</div>
                            </label>
                        </div>
                        <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-lg" disabled={isSubmitting || !origin || !destination}>
                            {isSubmitting ? 'Searching...' : 'Search Flights'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
        </Suspense>
    );
}
