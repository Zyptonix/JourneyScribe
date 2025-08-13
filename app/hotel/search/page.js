'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NavigationBar from '@/components/NavigationBar';
import NavigationBarLight from '@/components/NavigationBarLight';

export default function HotelSearchPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  // Calculate tomorrow's date for default check-in
  const getTomorrowDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  };

  // Initial Hotel Search States
  const [citySearchTerm, setCitySearchTerm] = useState(''); // What user types in city input
  const [citySuggestions, setCitySuggestions] = useState([]); // List of suggested cities
  const [selectedCityIata, setSelectedCityIata] = useState(''); // IATA code of the selected city for API calls

  const [checkInDate, setCheckInDate] = useState(getTomorrowDate()); 
  const [checkOutDate, setCheckOutDate] = useState(''); 
  const [adults, setAdults] = useState(1);
  const [roomQuantity, setRoomQuantity] = useState(1);

  // Min dates for date inputs
  const minCheckInDate = getTomorrowDate();
  const minCheckOutDate = checkInDate ? 
    (() => {
      const date = new Date(checkInDate);
      date.setDate(date.getDate() + 1); 
      return date.toISOString().split('T')[0];
    })() : 
    getTomorrowDate();

  // Ref to close suggestions when clicking outside
  const suggestionsRef = useRef(null);

  // Effect to handle clicking outside suggestions to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setCitySuggestions([]); // Clear suggestions
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // --- City Search Autocomplete Logic ---
  useEffect(() => {
    const fetchCitySuggestions = async () => {
      if (citySearchTerm.length < 2) {
        setCitySuggestions([]);
        setSelectedCityIata(''); // Clear selected IATA if search term is too short
        return;
      }

      setError(''); // Clear previous errors when typing
      try {
        const response = await fetch(`/api/city-search?keyword=${encodeURIComponent(citySearchTerm)}`);
        
        if (!response.ok) {
          const errorData = await response.json(); // Attempt to read error message
          setError(errorData.error || `Failed to fetch city suggestions with status: ${response.status}`);
          setCitySuggestions([]); // Ensure it's an array on error
          return;
        }

        const data = await response.json(); // Parse JSON only if response is OK
        
        // Ensure data is an array before setting state
        if (Array.isArray(data)) {
            setCitySuggestions(data);
        } else {
            console.error("City search API returned non-array data:", data);
            setError("Unexpected data format from city search API.");
            setCitySuggestions([]);
        }

      } catch (err) {
        console.error("City search API network/parsing error:", err);
        setError(`Network or parsing error fetching city suggestions: ${err.message}`);
        setCitySuggestions([]); // Ensure it's an array on network/parsing error
      }
    };

    const handler = setTimeout(() => {
      fetchCitySuggestions();
    }, 300); // Debounce API call for 300ms

    return () => {
      clearTimeout(handler); // Clear timeout on unmount or re-render
    };
  }, [citySearchTerm]); // Re-run when citySearchTerm changes

  // Handle selecting a city from suggestions
  const handleSelectCitySuggestion = (city) => {
    setCitySearchTerm(`${city.name} (${city.iataCode})`); // Display full name + IATA
    setSelectedCityIata(city.iataCode); // Store IATA for API call
    setCitySuggestions([]); // Clear suggestions
  };

  // Handle popular city button click
  const handlePopularCityClick = (cityName, iataCode) => {
    setCitySearchTerm(`${cityName} (${iataCode})`);
    setSelectedCityIata(iataCode);
    setCitySuggestions([]); // Clear any open suggestions
    setError(''); // Clear error
  };

  // Handle Check-in date change to ensure check-out date is valid
  const handleCheckInDateChange = (e) => {
    const newCheckInDate = e.target.value;
    setCheckInDate(newCheckInDate);

    if (newCheckInDate && new Date(checkOutDate) <= new Date(newCheckInDate)) {
      const newCheckOut = new Date(newCheckInDate);
      newCheckOut.setDate(newCheckOut.getDate() + 1);
      setCheckOutDate(newCheckOut.toISOString().split('T')[0]);
    } else if (!checkOutDate) { // Set a default checkout if not already set
        const newCheckOut = new Date(newCheckInDate);
        newCheckOut.setDate(newCheckOut.getDate() + 1);
        setCheckOutDate(newCheckOut.toISOString().split('T')[0]);
    }
  };


  // --- Handle Search Form Submission ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Use selectedCityIata for the API call
    if (!selectedCityIata || !checkInDate || !checkOutDate || !adults || !roomQuantity) {
      setError("Please ensure you select a valid city, and fill in all other required search criteria (Dates, Adults, Rooms).");
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
        setError("Check-out date must be after check-in date.");
        return;
    }


    // Construct query parameters for the HotelListPage
    const queryParams = new URLSearchParams({
      cityCode: selectedCityIata, // Use the selected IATA code here
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      adults: adults.toString(),
      roomQuantity: roomQuantity.toString(),
    }).toString();

    // Navigate to the HotelListPage, passing all parameters
    router.push(`/hotel/list?${queryParams}`);
  };

  return (
    <div className="min-h-screen  font-inter bg-gradient-to-br from-blue-100 to-purple-100">
        <div className='relative'><NavigationBarLight /></div>
      <div className='flex items-center justify-center p-4 mt-10'>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-300 hover:scale-105">
        <h1 className="text-4xl font-extrabold text-center text-slate-800 mb-8 tracking-tight">
          Find Your Perfect Stay 🌍
        </h1>

        {error && (
          <p className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-center font-medium border border-red-200">
            {error}
          </p>
        )}
        
        <div className="space-y-6">
          <p className="text-xl text-slate-700 text-center mb-6">
            Enter your destination and dates to explore hotels.
          </p>
          <form onSubmit={handleSearchSubmit} className="space-y-5">
            {/* City Search Input with Autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <label htmlFor="citySearch" className="block text-sm font-medium text-slate-700 mb-1">Destination City</label>
              <input
                id="citySearch"
                type="text"
                placeholder="e.g., New York, Paris, London"
                value={citySearchTerm}
                onChange={(e) => {
                  setCitySearchTerm(e.target.value);
                  // If user clears input, clear selected IATA too
                  if (e.target.value === '') {
                    setSelectedCityIata('');
                  }
                }}
                className="text-black p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                required
              />
              {/* Debugging: Log citySuggestions type and content */}
              {/* {console.log('City Suggestions Type:', typeof citySuggestions, 'Content:', citySuggestions)} */}

              {/* Ensure citySuggestions is an array before mapping */}
              {Array.isArray(citySuggestions) && citySuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-slate-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                  {citySuggestions.map((city) => (
                    <li
                      key={city.iataCode}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-200 last:border-b-0"
                      onClick={() => handleSelectCitySuggestion(city)}
                    >
                      <span className="font-semibold text-slate-800">{city.name}</span>
                      <span className="text-sm text-slate-500 ml-2">({city.iataCode})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Popular Cities */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Popular Cities:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePopularCityClick('London', 'LON')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                >
                  London (LON)
                </button>
                <button
                  type="button"
                  onClick={() => handlePopularCityClick('New York', 'NYC')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                >
                  New York (NYC)
                </button>
                <button
                  type="button"
                  onClick={() => handlePopularCityClick('Paris', 'PAR')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                >
                  Paris (PAR)
                </button>
                <button
                  type="button"
                  onClick={() => handlePopularCityClick('Dhaka', 'DAC')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                >
                  Dhaka (DAC)
                </button>
              </div>
            </div>


            {/* Check-in and Check-out Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkInDate" className="block text-sm font-medium text-slate-700 mb-1">Check-in Date</label>
                <input
                  id="checkInDate"
                  type="date"
                  value={checkInDate}
                  onChange={handleCheckInDateChange}
                  min={minCheckInDate}
                  className="text-black p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="checkOutDate" className="block text-sm font-medium text-slate-700 mb-1">Check-out Date</label>
                <input
                  id="checkOutDate"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={minCheckOutDate}
                  className="text-black p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Adults and Rooms Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="adults" className="block text-sm font-medium text-slate-700 mb-1">Adults per room</label>
                    <input
                        id="adults"
                        type="number"
                        value={adults}
                        min="1"
                        onChange={(e) => setAdults(parseInt(e.target.value))}
                        className="text-black p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="roomQuantity" className="block text-sm font-medium text-slate-700 mb-1">Number of rooms</label>
                    <input
                        id="roomQuantity"
                        type="number"
                        value={roomQuantity}
                        min="1"
                        onChange={(e) => setRoomQuantity(parseInt(e.target.value))}
                        className="text-black p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        required
                    />
                </div>
            </div>
            
            {/* Search Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Search Hotels
            </button>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
