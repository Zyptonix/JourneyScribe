'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavigationBarLight from '@/components/NavigationBarLight';

export default function HotelListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract all parameters from URL
  const cityCode = searchParams.get('cityCode');
  const checkInDate = searchParams.get('checkInDate');
  const checkOutDate = searchParams.get('checkOutDate');
  const adults = searchParams.get('adults');
  const roomQuantity = searchParams.get('roomQuantity');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hotelList, setHotelList] = useState([]); // Stores filtered results from /api/hotel/list

  useEffect(() => {
    // Only fetch hotel list if all crucial parameters are available from URL params
    if (cityCode && checkInDate && checkOutDate && adults && roomQuantity) {
      handleFetchFilteredHotelList();
    } else {
      setError("Missing search criteria. Please go back to the search page.");
    }
  }, [cityCode, checkInDate, checkOutDate, adults, roomQuantity]); // Re-fetch when these params change in URL

  // --- Handle Fetching Filtered Hotel List ---
  const handleFetchFilteredHotelList = async () => {
    setLoading(true);
    setError('');
    setHotelList([]); // Clear previous list

    try {
      // Call the /api/hotel/list endpoint, which now handles the filtering
      const queryParams = new URLSearchParams({
        cityCode: cityCode,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        adults: adults.toString(),
        roomQuantity: roomQuantity.toString(),
      }).toString();

      const response = await fetch(`/api/hotels/list?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setHotelList(data);
        if (data.length === 0) {
          setError(`No hotels found with available offers for ${cityCode} from ${checkInDate} to ${checkOutDate}. Try different dates or adjust guest count.`);
        }
      } else {
        setError(data.error || 'Failed to fetch filtered hotel list from API route.');
      }
    } catch (err) {
      console.error("Filtered hotel list API route error:", err);
      setError(`Network error during hotel search: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Navigate to Offers Page ---
  const handleViewOffers = (hotelId, hotelName) => {
    // All necessary parameters are already available from URL, just pass them
    router.push(`offer?hotelId=${hotelId}&hotelName=${hotelName}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}&roomQuantity=${roomQuantity}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <div><NavigationBarLight /></div>
      <div className="p-8 ">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-6">
          Available Hotels in {cityCode || 'Loading...'} 🏨
        </h1>

        {error && (
          <p className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</p>
        )}
        
        {loading && (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-slate-700">Loading hotels with available offers...</p>
          </div>
        )}

        {!loading && hotelList.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-slate-700 mb-4">
                Hotels with Available Offers ({hotelList.length} found)
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Results for check-in: {checkInDate}, check-out: {checkOutDate}, adults: {adults}, rooms: {roomQuantity}.
            </p>
            <div className="space-y-4">
              {hotelList.map((hotel) => (
                <div key={hotel.hotelId} className="p-4 border border-slate-200 rounded-lg shadow-sm bg-white flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg text-blue-700">{hotel.name}</p>
                    <p className="text-slate-600">City: {hotel.cityName}</p>
                  </div>
                  <button
                    onClick={() => handleViewOffers(hotel.hotelId, hotel.name)}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
                  >
                    View Offers
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && hotelList.length === 0 && !error && (
            <p className="text-center text-slate-500 mt-8">No hotels found with available offers for your criteria. Please refine your search on the <a href="/hotel-search" className="text-blue-600 hover:underline">previous page</a>.</p>
        )}
      </div>
    </div>
  </div>
  );
}
