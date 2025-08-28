'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function DestinationSearchPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const [destinationSearchTerm, setDestinationSearchTerm] = useState(''); // What user types
  const [destinationSuggestions, setDestinationSuggestions] = useState([]); // List of suggested locations
  const [selectedLocation, setSelectedLocation] = useState(null); // Full object of selected location

  const suggestionsRef = useRef(null);

  // Effect to handle clicking outside suggestions to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setDestinationSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- Destination Search Autocomplete Logic ---
  useEffect(() => {
    const fetchDestinationSuggestions = async () => {
      if (destinationSearchTerm.length < 2) {
        setDestinationSuggestions([]);
        setSelectedLocation(null);
        return;
      }

      setError('');
      try {
        // Call the new /api/location-search endpoint
        const response = await fetch(`/api/destination-search?keyword=${encodeURIComponent(destinationSearchTerm)}`);
        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
          setDestinationSuggestions(data);
        } else {
          setError(data.error || 'Failed to fetch destination suggestions.');
          setDestinationSuggestions([]);
        }
      } catch (err) {
        console.error("Destination search API error:", err);
        setError(`Network or parsing error fetching destination suggestions: ${err.message}`);
        setDestinationSuggestions([]);
      }
    };

    const handler = setTimeout(() => {
      fetchDestinationSuggestions();
    }, 300); // Debounce API call for 300ms

    return () => {
      clearTimeout(handler);
    };
  }, [destinationSearchTerm]);

  // Handle selecting a destination from suggestions
  const handleSelectDestinationSuggestion = (location) => {
    setDestinationSearchTerm(location.name + (location.iataCode ? ` (${location.iataCode})` : ''));
    setSelectedLocation(location); // Store the full selected object
    setDestinationSuggestions([]); // Clear suggestions
  };

  // Handle popular destination click (example cities, you can add landmarks too)
  const handlePopularDestinationClick = (name, id, type, iataCode, latitude, longitude) => {
    const location = { name, id, type, iataCode, latitude, longitude };
    setDestinationSearchTerm(name + (iataCode ? ` (${iataCode})` : ''));
    setSelectedLocation(location);
    setDestinationSuggestions([]);
    setError('');
  };

  // --- Handle Search Form Submission (to Destination Details Page) ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedLocation) {
      setError("Please select a destination from the suggestions or popular options.");
      return;
    }

    // Prepare query parameters based on the type of selected location
    const queryParams = new URLSearchParams();
    queryParams.set('name', selectedLocation.name);
    queryParams.set('type', selectedLocation.type);

    if (selectedLocation.type === 'POINT_OF_INTEREST') {
      queryParams.set('locationId', selectedLocation.id);
    } else if (selectedLocation.latitude && selectedLocation.longitude) {
      queryParams.set('latitude', selectedLocation.latitude);
      queryParams.set('longitude', selectedLocation.longitude);
      if (selectedLocation.iataCode) {
        queryParams.set('iataCode', selectedLocation.iataCode); // For cities
      }
    } else if (selectedLocation.iataCode) { // Fallback for cities without geoCode immediately
      queryParams.set('iataCode', selectedLocation.iataCode);
    } else {
        setError("Selected destination has insufficient data to find attractions.");
        return;
    }

    // Navigate to the Destination Details Page
    router.push(`/destination/details?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-100 to-teal-100 font-inter">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-300 hover:scale-105">
        <h1 className="text-4xl font-extrabold text-center text-slate-800 mb-8 tracking-tight">
          Explore Destinations & Attractions ✨
        </h1>

        {error && (
          <p className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-center font-medium border border-red-200">
            {error}
          </p>
        )}
        
        <div className="space-y-6">
          <p className="text-xl text-slate-700 text-center mb-6">
            Search for cities, countries, or specific landmarks.
          </p>
          <form onSubmit={handleSearchSubmit} className="space-y-5">
            {/* Destination Search Input with Autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <label htmlFor="destinationSearch" className="block text-sm font-medium text-slate-700 mb-1">Search Destination</label>
              <input
                id="destinationSearch"
                type="text"
                placeholder="e.g., Paris, Eiffel Tower, Tokyo"
                value={destinationSearchTerm}
                onChange={(e) => {
                  setDestinationSearchTerm(e.target.value);
                  if (e.target.value === '') {
                    setSelectedLocation(null);
                  }
                }}
                className="text-black p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                required
              />
              {Array.isArray(destinationSuggestions) && destinationSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-slate-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                  {destinationSuggestions.map((loc) => (
                    <li
                      key={loc.id || loc.iataCode} // Use ID for POI, IATA for City/Airport
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-200 last:border-b-0"
                      onClick={() => handleSelectDestinationSuggestion(loc)}
                    >
                      <span className="font-semibold text-slate-800">{loc.name}</span>
                      <span className="text-sm text-slate-500 ml-2">({loc.type}) {loc.iataCode && `(${loc.iataCode})`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Popular Destinations */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Popular Destinations:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePopularDestinationClick('Paris', 'city-PAR', 'CITY', 'PAR', 48.8566, 2.3522)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm hover:bg-purple-600 transition-colors"
                >
                  Paris (City)
                </button>
                <button
                  type="button"
                  onClick={() => handlePopularDestinationClick('Eiffel Tower', 'POI-EIFFELTOWER', 'POINT_OF_INTEREST', null, 48.8584, 2.2945)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm hover:bg-purple-600 transition-colors"
                >
                  Eiffel Tower (Landmark)
                </button>
                 <button
                  type="button"
                  onClick={() => handlePopularDestinationClick('New York', 'city-NYC', 'CITY', 'NYC', 40.7128, -74.0060)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm hover:bg-purple-600 transition-colors"
                >
                  New York (City)
                </button>
              </div>
            </div>
            
            {/* Search Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Discover Attractions
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
