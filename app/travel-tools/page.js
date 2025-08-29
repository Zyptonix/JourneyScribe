'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import NavigationBarDark from '@/components/NavigationBarDark';
import CitySearchInput from '@/components/CitySearchInput';

// --- Main Combined Travel Tools Page ---

export default function TravelToolsPage() {
    return (
        <div className="relative min-h-screen w-full">
            {/* 1. Background Image Layer */}
            <div 
                className="absolute inset-0 bg-center bg-cover filter blur-sm" // You can change blur-md to blur-sm or blur-lg
                style={{ backgroundImage: "url('/assets/timecurrency.jpg')" }}
            />
            {/* 2. Darkening Overlay Layer */}
            <div className="absolute inset-0 bg-black/20" /> {/* Adjust opacity with bg-black/50, bg-black/70, etc. */}

            {/* 3. Content Layer */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
                <div className="fixed top-0 left-0 w-full z-50">
                    <NavigationBarDark />
                </div>
                
                <div className="w-full max-w-7xl mx-auto mt-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-32">
                        <TimeConverter />
                        <CurrencyConverter />
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- Time Converter Component ---

function TimeConverter() {
    const [fromQuery, setFromQuery] = useState('Dhaka (DAC)');
    const [toQuery, setToQuery] = useState('New York (JFK)');
    const [fromZone, setFromZone] = useState('Asia/Dhaka');
    const [toZone, setToZone] = useState('America/New_York');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const convertTime = useCallback(async () => {
        if (!fromZone || !toZone) return;
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const res = await fetch(`/api/convert-time?from=${fromZone}&to=${toZone}`);
            const json = await res.json();
            if (json.success) {
                setResult(json);
            } else {
                setError(json.error || 'Could not convert time.');
                console.error("API Error:", json.error);
            }
        } catch (error) {
            setError('Failed to fetch time conversion.');
            console.error("Failed to fetch time conversion:", error);
        } finally {
            setLoading(false);
        }
    }, [fromZone, toZone]);
    
    useEffect(() => {
        convertTime();
    }, [convertTime]);

    const handleCitySelection = async (city, type) => {
        if (!city || !city.geoCode || !city.geoCode.latitude || !city.geoCode.longitude) {
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
                if (type === 'from') {
                    setFromZone(json.timezone);
                } else {
                    setToZone(json.timezone);
                }
            } else {
                throw new Error(json.error || 'Could not find timezone for this location.');
            }
        } catch (err) {
            setError(err.message);
            console.error(err);
        }
    };

    return (
        <div className="backdrop-blur-xl bg-zinc-900/70 rounded-2xl shadow-2xl border border-zinc-700 p-8 w-full animate-fade-in">
            <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3 mb-6 drop-shadow-lg">
                ⏰ Time Converter
            </h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Your Location</label>
                    <CitySearchInput 
                        value={fromQuery}
                        onQueryChange={setFromQuery}
                        onCitySelect={(city) => handleCitySelection(city, 'from')}
                        placeholder="Search for a city..." 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Destination</label>
                    <CitySearchInput 
                        value={toQuery}
                        onQueryChange={setToQuery}
                        onCitySelect={(city) => handleCitySelection(city, 'to')}
                        placeholder="Search for a city..." 
                    />
                </div>
            </div>

            {loading && <div className="h-44 flex items-center justify-center text-zinc-400 mt-6">Loading...</div>}
            
            {error && !loading && (
                 <div className="mt-6 text-red-300 text-center bg-red-500/20 p-3 rounded-xl h-44 flex items-center justify-center">
                    <p>{error}</p>
                </div>
            )}

            {/* FIX: Removed fixed height (h-40) to prevent overflow */}
            {result && !loading && !error && (
                <div className="mt-6 space-y-4 text-white animate-fade-in">
                    <div className="bg-black/30 p-4 rounded-xl">
                        <p className="text-sm text-zinc-400 truncate">{result.fromZone.replace(/_/g, ' ')}</p>
                        <p className="text-3xl font-bold">{new Date(result.fromTimestamp * 1000).toLocaleTimeString([], { timeZone: result.fromZone, hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-xs text-zinc-500">{new Date(result.fromTimestamp * 1000).toLocaleDateString([], { timeZone: result.fromZone, weekday: 'long' })}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl">
                        <p className="text-sm text-zinc-400 truncate">{result.toZone.replace(/_/g, ' ')}</p>
                        <p className="text-3xl font-bold">{new Date(result.toTimestamp * 1000).toLocaleTimeString([], { timeZone: result.toZone, hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-xs text-zinc-500">{new Date(result.toTimestamp * 1000).toLocaleDateString([], { timeZone: result.toZone, weekday: 'long' })}</p>
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
    const [toCurrency, setToCurrency] = useState("EUR");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const convertCurrency = async () => {
        if (!amount || !fromCurrency || !toCurrency) return;
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
    };

    return (
        <div className="backdrop-blur-xl bg-zinc-900/70 rounded-2xl shadow-2xl border border-zinc-700 p-8 w-full animate-fade-in">
            <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3 mb-6 drop-shadow-lg">
                💱 Currency Converter
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="sm:col-span-1 p-3 rounded-xl bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white border border-zinc-700"
                    placeholder="Amount"
                />
                <input
                    type="text"
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    maxLength="3"
                    className="sm:col-span-1 p-3 rounded-xl bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white border border-zinc-700 uppercase text-center"
                    placeholder="FROM"
                />
                <input
                    type="text"
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    maxLength="3"
                    className="sm:col-span-1 p-3 rounded-xl bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white border border-zinc-700 uppercase text-center"
                    placeholder="TO"
                />
            </div>
            
            <button
                onClick={convertCurrency}
                disabled={loading}
                className="w-full py-3 mt-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Converting...' : 'Convert'}
            </button>

            {error && (
                <div className="mt-6 text-red-300 text-center bg-red-500/20 p-3 rounded-xl h-28 flex items-center justify-center">
                    <p>{error}</p>
                </div>
            )}

            {result && !error && (
                <div className="mt-6 text-white text-center text-lg bg-black/30 p-4 rounded-xl h-28 flex flex-col justify-center">
                    <p className="text-sm text-zinc-400">{result.amount} {result.from} is currently</p>
                    <p className="font-bold text-3xl mt-1">
                        {parseFloat(result.convertedAmount).toFixed(2)}
                        <span className="text-zinc-400 ml-2">{result.to}</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">Exchange Rate: 1 {result.from} = {result.rate.toFixed(4)} {result.to}</p>
                </div>
            )}
        </div>
    );
}
