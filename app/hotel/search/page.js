'use client';
import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavigationBarDark from '@/components/NavigationBarDark';
import CitySearchInput from '@/components/CitySearchInput';
import NavigationBarLight from '@/components/NavigationBarLight';

// --- Icon Components for UI Enhancement ---
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0112 13.5a5.995 5.995 0 013 1.303m-3-1.303A4 4 0 1112 4.354" /></svg>;
const DoorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 2h12a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>;

export default function HotelSearchPage() {
    const router = useRouter();
    const [error, setError] = useState('');

    const getTomorrowDate = () => {
        const today = new Date();
        today.setDate(today.getDate() + 1);
        return today.toISOString().split('T')[0];
    };

    // --- Search States ---
    const [cityQuery, setCityQuery] = useState('');
    const [selectedCityIata, setSelectedCityIata] = useState('');
    const [checkInDate, setCheckInDate] = useState(getTomorrowDate());
    const [checkOutDate, setCheckOutDate] = useState('');
    const [adults, setAdults] = useState(1);
    const [roomQuantity, setRoomQuantity] = useState(1);
    const [rating, setRating] = useState('');
    const [amenities, setAmenities] = useState([]);
    const [radius, setRadius] = useState('');
    const [radiusUnit, setRadiusUnit] = useState('KM');
    const [boardType, setBoardType] = useState('');
    const [includeClosed, setIncludeClosed] = useState(true);
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    const availableAmenities = ['SWIMMING_POOL', 'SPA', 'FITNESS_CENTER', 'AIR_CONDITIONING', 'RESTAURANT', 'PARKING', 'PETS_ALLOWED', 'AIRPORT_SHUTTLE', 'BUSINESS_CENTER', 'DISABLED_FACILITIES', 'WIFI', 'MEETING_ROOMS', 'NO_KID_ALLOWED', 'TENNIS', 'GOLF', 'KITCHEN', 'ANIMAL_WATCHING', 'BABY-SITTING', 'BEACH', 'CASINO', 'JACUZZI', 'SAUNA', 'SOLARIUM', 'MASSAGE', 'VALET_PARKING', 'BAR or LOUNGE', 'KIDS_WELCOME', 'NO_PORN_FILMS', 'MINIBAR', 'TELEVISION', 'WI-FI_IN_ROOM', 'ROOM_SERVICE', 'GUARDED_PARKG', 'SERV_SPEC_MENU'];
    const popularCities = [{ name: 'London', iata: 'LON' }, { name: 'New York', iata: 'NYC' }, { name: 'Paris', iata: 'PAR' }, { name: 'Dhaka', iata: 'DAC' }, { name: 'Dubai', iata: 'DXB' }];

    const handleCheckInDateChange = (e) => {
        const newCheckInDate = e.target.value;
        setCheckInDate(newCheckInDate);
        if (newCheckInDate && (!checkOutDate || new Date(checkOutDate) <= new Date(newCheckInDate))) {
            const newCheckOut = new Date(newCheckInDate);
            newCheckOut.setDate(newCheckOut.getDate() + 1);
            setCheckOutDate(newCheckOut.toISOString().split('T')[0]);
        }
    };

    const handleAmenityChange = (e) => {
        const { value, checked } = e.target;
        setAmenities(prev => checked ? [...prev, value] : prev.filter(a => a !== value));
    };

    const handlePopularCityClick = (city) => {
        setCityQuery(`${city.name} (${city.iata})`);
        setSelectedCityIata(city.iata);
        setError('');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!selectedCityIata || !checkInDate || !checkOutDate) {
            setError("Please select a valid city and provide check-in and check-out dates.");
            return;
        }
        if (new Date(checkOutDate) <= new Date(checkInDate)) {
            setError("Check-out date must be after check-in date.");
            return;
        }

        // --- FIX: Extract clean city name and add it to the params ---
        const cleanCityName = cityQuery.split('(')[0].trim();

        const params = {
            cityCode: selectedCityIata,
            cityName: cleanCityName, // Pass the full name
            checkInDate,
            checkOutDate,
            adults: adults.toString(),
            roomQuantity: roomQuantity.toString(),
            includeClosed: includeClosed.toString(),
        };
        if (rating) params.ratings = rating;
        if (amenities.length > 0) params.amenities = amenities.join(',');
        if (radius) {
            params.radius = radius;
            params.radiusUnit = radiusUnit;
        }
        if (boardType) params.boardType = boardType;

        const queryParams = new URLSearchParams(params).toString();
        router.push(`/hotel/list?${queryParams}`);
    };

    return (
        <Suspense>
        <div className="min-h-screen font-inter flex flex-col">
            <div className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/hotel.jpg')" }}></div>
            <div className="fixed inset-x-0 top-0 h-[100vh] bg-black opacity-20 "></div>
            <NavigationBarLight />
            <div className='flex-grow flex items-center justify-center p-4'>
                <div className="w-full max-w-2xl bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    <h1 className="text-4xl font-extrabold text-center text-white mb-6">Find Your Perfect Stay 🏨</h1>
                    {error && <p className="mb-4 p-3 bg-red-500/50 text-white rounded-lg text-center">{error}</p>}
                    <form onSubmit={handleSearchSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-100 mb-1">Destination</label>
                            <CitySearchInput value={cityQuery} onQueryChange={setCityQuery} onCitySelect={setSelectedCityIata} placeholder="e.g., New York, Paris" required />
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-sm text-slate-200 pt-1.5">Popular:</span>
                                {popularCities.map(city => (
                                    <button key={city.iata} type="button" onClick={() => handlePopularCityClick(city)} className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-semibold hover:bg-white/30 transition-colors">
                                        {city.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Other form fields remain the same */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative"><label htmlFor="checkInDate" className="block text-sm font-medium text-slate-100 mb-1">Check-in</label><div className="absolute left-3 top-9"><CalendarIcon /></div><input id="checkInDate" type="date" value={checkInDate} onChange={handleCheckInDateChange} min={getTomorrowDate()} className="bg-white/20 text-white p-3 pl-10 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300" required /></div>
                            <div className="relative"><label htmlFor="checkOutDate" className="block text-sm font-medium text-slate-100 mb-1">Check-out</label><div className="absolute left-3 top-9"><CalendarIcon /></div><input id="checkOutDate" type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} min={checkInDate ? (() => { const d = new Date(checkInDate); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })() : getTomorrowDate()} className="bg-white/20 text-white p-3 pl-10 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300" required /></div>
                            <div className="relative"><label htmlFor="adults" className="block text-sm font-medium text-slate-100 mb-1">Adults</label><div className="absolute left-3 top-9"><UsersIcon /></div><input id="adults" type="number" value={adults} min="1" onChange={(e) => setAdults(parseInt(e.target.value))} className="bg-white/20 text-white p-3 pl-10 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300" required /></div>
                            <div className="relative"><label htmlFor="roomQuantity" className="block text-sm font-medium text-slate-100 mb-1">Rooms</label><div className="absolute left-3 top-9"><DoorIcon /></div><input id="roomQuantity" type="number" value={roomQuantity} min="1" onChange={(e) => setRoomQuantity(parseInt(e.target.value))} className="bg-white/20 text-white p-3 pl-10 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300" required /></div>
                        </div>
                        <div className="pt-2">
                            <button type="button" onClick={() => setShowMoreOptions(!showMoreOptions)} className="text-cyan-300 font-semibold text-sm hover:underline">{showMoreOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}</button>
                            {showMoreOptions && (
                                <div className="mt-4 space-y-4 border-t border-white/20 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="rating" className="block text-sm font-medium text-slate-100 mb-1">Min. Star Rating</label><select id="rating" value={rating} onChange={(e) => setRating(e.target.value)} className="bg-white/20 text-white p-3 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300"><option value="">Any</option><option value="1">★</option><option value="2">★★</option><option value="3">★★★</option><option value="4">★★★★</option><option value="5">★★★★★</option></select></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label htmlFor="radius" className="block text-sm font-medium text-slate-100 mb-1">Radius</label><input id="radius" type="number" placeholder="e.g., 5" value={radius} min="1" onChange={(e) => setRadius(e.target.value)} className="bg-white/20 text-white p-3 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300" /></div>
                                            <div><label htmlFor="radiusUnit" className="block text-sm font-medium text-slate-100 mb-1">Unit</label><select id="radiusUnit" value={radiusUnit} onChange={(e) => setRadiusUnit(e.target.value)} className="bg-white/20 text-white p-3 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300"><option value="KM">KM</option><option value="MILE">MILE</option></select></div>
                                        </div>
                                    </div>
                                    <div><label htmlFor="boardType" className="block text-sm font-medium text-slate-100 mb-1">Meal Plan</label><select id="boardType" value={boardType} onChange={(e) => setBoardType(e.target.value)} className="bg-white/20 text-white p-3 border border-white/30 rounded-lg w-full focus:ring-cyan-300 focus:border-cyan-300"><option value="">Any</option><option value="ROOM_ONLY">Room Only</option><option value="BREAKFAST">Breakfast</option><option value="HALF_BOARD">Half Board</option><option value="FULL_BOARD">Full Board</option><option value="ALL_INCLUSIVE">All Inclusive</option></select></div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-100 mb-2">Amenities</label>
                                        <div className="p-4 border border-white/30 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                                            {availableAmenities.map(amenity => (<div key={amenity} className="flex items-center"><input type="checkbox" id={amenity} value={amenity} checked={amenities.includes(amenity)} onChange={handleAmenityChange} className="h-4 w-4 rounded bg-white/20 border-white/30 text-cyan-500 focus:ring-cyan-400" /><label htmlFor={amenity} className="ml-2 text-sm text-slate-100 capitalize">{amenity.replace(/_/g, ' ').toLowerCase()}</label></div>))}
                                        </div>
                                    </div>
                                    <div className="flex items-center pt-2"><input type="checkbox" id="includeClosed" checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} className="h-4 w-4 rounded bg-white/20 border-white/30 text-cyan-500 focus:ring-cyan-400" /><label htmlFor="includeClosed" className="ml-2 text-sm text-slate-100">Include sold out hotels</label></div>
                                </div>
                            )}
                        </div>
                        <button type="submit" className="w-full bg-gradient-to-r from-blue-700 to-cyan-700 text-white p-4 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">Search Hotels</button>
                    </form>
                </div>
            </div>
        </div>
        </Suspense>
    );

}
