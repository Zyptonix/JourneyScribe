'use client';
import React, { Suspense, useState } from 'react';
import NavigationBar from '@/components/NavigationBar';
export default function FlightSearchPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Flight Search States
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState(''); // Your /api/flights/search doesn't currently use returnDate
  const [adults, setAdults] = useState(1);
  const [flightOffers, setFlightOffers] = useState([]);
  const [flightSortBy, setFlightSortBy] = useState('price'); // 'price' or 'duration'

  // --- Flight Search Logic (using your /api/flights/search route) ---
  const handleFlightSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFlightOffers([]);

    try {
      const queryParams = new URLSearchParams({
        origin: origin,
        destination: destination,
        departureDate: departureDate,
        adults: adults.toString(),
        // Add returnDate here if your /api/flights/search will implement it
      }).toString();

      const response = await fetch(`/api/flights/search?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        let sortedOffers = data;
        if (flightSortBy === 'price') {
          sortedOffers.sort((a, b) => {
            // Extract numeric price from "X BDT" string for sorting
            const priceA = parseFloat(a.priceBDT);
            const priceB = parseFloat(b.priceBDT);
            return priceA - priceB;
          });
        } else if (flightSortBy === 'duration') {
          // IMPORTANT: Your /api/flights/search currently doesn't return duration in the simplified format.
          // To enable this sorting, you'll need to modify /api/flights/search to include duration
          // in its simplified output. For now, this sorting option won't be fully functional.
          setError("Duration sorting requires modification to your backend flight API to return duration data.");
        }
        setFlightOffers(sortedOffers);
      } else {
        setError(data.error || 'Failed to fetch flight offers from API route.');
      }
    } catch (err) {
      console.error("Flight search API route error:", err);
      setError(`Network error calling flight search API: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Suspense>
    <div className=" min-h-screen  bg-slate-50 font-inter">
      <div><NavigationBar /></div>
      <div className='p-8'>
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-6">Find Your Flight ✈️</h1>

        {error && (
          <p className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</p>
        )}

        {/* --- Flight Search Form --- */}
        <div>
          <h2 className="text-2xl font-bold text-slate-700 mb-4 text-center">Search Flights</h2>
          <form onSubmit={handleFlightSearch} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Origin (IATA code, e.g., DAC)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                className="text-black p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Destination (IATA code, e.g., BKK)"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                className="text-black p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <input
                type="date"
                placeholder="Departure Date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="text-black p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <input
                type="number"
                placeholder="Adults"
                value={adults}
                min="1"
                onChange={(e) => setAdults(parseInt(e.target.value))}
                className="text-black p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
               <select
                value={flightSortBy}
                onChange={(e) => setFlightSortBy(e.target.value)}
                className="text-black p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="price">Sort by Price (BDT)</option>
                <option value="duration">Sort by Duration (Limited)</option> 
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Searching Flights...' : 'Search Flights'}
            </button>
          </form>

          {loading && (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          )}

          {flightOffers.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-700 mb-4">Available Flights</h3>
              <div className="space-y-4">
                {flightOffers.map((offer, index) => (
                  <div key={index} className="p-4 border border-slate-200 rounded-lg shadow-sm bg-white">
                    <p className="font-semibold text-lg text-blue-700">Price: {offer.priceBDT} ({offer.originalPrice})</p>
                    <p className="text-slate-600 font-medium">From: {offer.from} to {offer.to}</p>
                    {offer.hasTransits ? (
                      <p className="text-sm text-slate-500">Transits: {offer.transitLocations.join(', ')}</p>
                    ) : (
                      <p className="text-sm text-slate-500">Direct Flight</p>
                    )}
                    <button className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {flightOffers.length === 0 && !loading && !error && (
              <p className="text-center text-slate-500 mt-8">No flights found. Try adjusting your search criteria.</p>
          )}
        </div>
      </div>
    </div>
    </div>
    </Suspense>
  );
}
