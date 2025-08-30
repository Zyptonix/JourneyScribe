// File: /app/travel-tools/page.js

'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import NavigationBarDark from '@/components/NavigationBarDark';
import CitySearchInput from '@/components/CitySearchInputgeo'; // Use the corrected component

// --- Main Combined Travel Tools Page ---
export default function TravelToolsPage() {
    return (
        <div className="relative min-h-screen w-full">
            {/* Background and Overlay */}
            <div className="absolute inset-0 bg-center bg-cover filter blur-sm" style={{ backgroundImage: "url('/assets/timecurrency.jpg')" }} />
            <div className="absolute inset-0 bg-black/20" />

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
                <div className="fixed top-0 left-0 w-full z-50"><NavigationBarDark /></div>
                <div className="w-full max-w-7xl mx-auto mt-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                        <TimeConverter />
                        <CurrencyConverter />
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- MODIFIED Time Converter Component ---
function TimeConverter() {
    const [fromQuery, setFromQuery] = useState('Dhaka (DAC)');
    const [toQuery, setToQuery] = useState('New York (JFK)');
    const [fromZone, setFromZone] = useState('Asia/Dhaka');
    const [toZone, setToZone] = useState('America/New_York');
    
    // NEW: State for the time input, defaults to current time
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const convertTime = useCallback(async () => {
        if (!fromZone || !toZone || !time) return;
        setLoading(true);
        setResult(null);
        setError('');
        try {
            // NEW: Pass the time to the API
            const res = await fetch(`/api/convert-time?from=${fromZone}&to=${toZone}&time=${time}`);
            const json = await res.json();
            if (json.success) {
                setResult(json);
            } else {
                throw new Error(json.error || 'Could not convert time.');
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [fromZone, toZone, time]); // NEW: Re-run when time changes
    
    useEffect(() => {
        convertTime();
    }, [convertTime]);

    const handleCitySelection = async (city, type) => {
        if (!city?.geoCode?.latitude || !city?.geoCode?.longitude) {
            setError('Selected city is missing location data.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { latitude, longitude } = city.geoCode;
            const res = await fetch(`/api/get-timezone?lat=${latitude}&lon=${longitude}`);
            const json = await res.json();
            if (json.success && json.timezone) {
                if (type === 'from') setFromZone(json.timezone);
                else setToZone(json.timezone);
            } else {
                throw new Error(json.error || 'Could not find timezone.');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="backdrop-blur-xl bg-zinc-900/70 rounded-2xl shadow-2xl border border-zinc-700 p-8 w-full animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center gap-3 mb-6">⏰ Time Converter</h2>
            
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Your Location</label>
                        <CitySearchInput 
                            value={fromQuery}
                            onQueryChange={setFromQuery}
                            onCitySelect={(city) => handleCitySelection(city, 'from')}
                        />
                    </div>
                    {/* NEW: Time Input Field */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full p-3 bg-white/20 text-white border border-white/30 rounded-lg focus:ring-cyan-300 focus:border-cyan-300"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Destination</label>
                    <CitySearchInput 
                        value={toQuery}
                        onQueryChange={setToQuery}
                        onCitySelect={(city) => handleCitySelection(city, 'to')}
                    />
                </div>
            </div>

            {loading && <div className="h-44 flex items-center justify-center text-zinc-400 mt-6">Loading...</div>}
            
            {error && !loading && <div className="mt-6 text-red-300 text-center bg-red-500/20 p-3 rounded-xl h-44 flex items-center justify-center"><p>{error}</p></div>}

            {result && !loading && !error && (
                <div className="mt-6 space-y-4 text-white animate-fade-in">
                    <div className="bg-black/30 p-4 rounded-xl">
                        <p className="text-sm text-zinc-400 truncate">{result.fromZone.replace(/_/g, ' ')}</p>
                        <p className="text-3xl font-bold">{result.fromTime}</p>
                        <p className="text-xs text-zinc-500">{result.fromDate}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl">
                        <p className="text-sm text-zinc-400 truncate">{result.toZone.replace(/_/g, ' ')}</p>
                        <p className="text-3xl font-bold">{result.toTime}</p>
                        <p className="text-xs text-zinc-500">{result.toDate}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
// --- Currency Converter Component ---

function CurrencyConverter() {
    const [amount, setAmount] = useState(1);
    const [fromCurrency, setFromCurrency] = useState("USD");
    const [toCurrency, setToCurrency] = useState("BDT");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const commonCurrencies = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'EUR', name: 'Euro' },
        { code: 'GBP', name: 'British Pound' },
        { code: 'INR', name: 'Indian Rupee' },
        { code: 'BDT', name: 'Taka' },
    ];

    const convertCurrency = useCallback(async () => {
        if (!amount || !fromCurrency || !toCurrency || fromCurrency.length !== 3 || toCurrency.length !== 3) {
            return;
        }
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const res = await fetch(`/api/convert-currency?from=${fromCurrency.toUpperCase()}&to=${toCurrency.toUpperCase()}&amount=${amount}`);
            const json = await res.json();
            if (json.success) {
                setResult(json);
            } else {
                setError(json.error || 'Invalid currency code.');
            }
        } catch (err) {
            setError('Failed to fetch conversion data.');
            console.error("Failed to fetch currency conversion:", err);
        } finally {
            setLoading(false);
        }
    }, [amount, fromCurrency, toCurrency]);

    useEffect(() => {
        const timer = setTimeout(() => {
            convertCurrency();
        }, 500);
        return () => clearTimeout(timer);
    }, [convertCurrency]);

    const handleSwapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    return (
        <div className="backdrop-blur-xl bg-zinc-900/70 rounded-2xl shadow-2xl border border-zinc-700 p-8 w-full animate-fade-in">
            <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3 mb-6 drop-shadow-lg">
                💱 Currency Converter
            </h2>
            
            <div className="space-y-4">
                {/* --- NEW: Amount input on its own row --- */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 rounded-xl bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white border border-zinc-700"
                        placeholder="1"
                    />
                </div>
                
                {/* --- NEW: From/To inputs on a second row --- */}
                <div className="grid grid-cols-[2fr_1fr_2fr] gap-3 items-center">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">From</label>
                        <input
                            type="text"
                            value={fromCurrency}
                            onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
                            maxLength="3"
                            className="w-full p-3 rounded-xl bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white border border-zinc-700 uppercase text-center"
                            placeholder="USD"
                        />
                    </div>
                    {/* Swap Button (aligned with labels) */}
                    <button onClick={handleSwapCurrencies} className="text-zinc-400 hover:text-white transition-colors flex justify-center mt-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </button>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">To</label>
                        <input
                            type="text"
                            value={toCurrency}
                            onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
                            maxLength="3"
                            className="w-full p-3 rounded-xl bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white border border-zinc-700 uppercase text-center"
                            placeholder="BDT"
                        />
                    </div>
                </div>
            </div>

            {/* --- NEW: Labeled rows of quick-select buttons --- */}
            <div className="mt-6 space-y-4">
                 <div>
                    <p className="text-xs text-zinc-400 text-center mb-2">Set 'From' Currency:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {commonCurrencies.map(currency => (
                            <button 
                                key={currency.code}
                                onClick={() => setFromCurrency(currency.code)}
                                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${fromCurrency === currency.code ? 'bg-white text-black' : 'bg-zinc-800/50 text-white hover:bg-zinc-700'}`}
                            >
                                {currency.code}
                            </button>
                        ))}
                    </div>
                 </div>
                 <div>
                    <p className="text-xs text-zinc-400 text-center mb-2">Set 'To' Currency:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {commonCurrencies.map(currency => (
                            <button 
                                key={currency.code}
                                onClick={() => setToCurrency(currency.code)}
                                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${toCurrency === currency.code ? 'bg-white text-black' : 'bg-zinc-800/50 text-white hover:bg-zinc-700'}`}
                            >
                                {currency.code}
                            </button>
                        ))}
                    </div>
                 </div>
            </div>
            
            <div className="mt-6 h-28 flex items-center justify-center">
                {loading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                ) : error ? (
                    <div className="text-red-300 text-center bg-red-500/20 p-3 rounded-xl w-full">
                        <p>{error}</p>
                    </div>
                ) : result && (
                    <div className="text-white text-center text-lg bg-black/30 p-4 rounded-xl w-full animate-fade-in">
                        <p className="text-sm text-zinc-400">{result.amount} {result.from} is currently</p>
                        <p className="font-bold text-3xl mt-1">
                            {parseFloat(result.convertedAmount).toFixed(2)}
                            <span className="text-zinc-400 ml-2">{result.to}</span>
                        </p>
                        <p className="text-xs text-zinc-500 mt-2">1 {result.from} = {result.rate.toFixed(4)} {result.to}</p>
                    </div>
                )}
            </div>
        </div>
    );
}