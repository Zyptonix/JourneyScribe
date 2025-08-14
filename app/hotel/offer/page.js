'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavigationBarLight from '@/components/NavigationBarLight';

export default function HotelOffersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const hotelId = searchParams.get('hotelId');
  const hotelName = searchParams.get('hotelName');
  const checkInDate = searchParams.get('checkInDate');
  const checkOutDate = searchParams.get('checkOutDate');
  const adults = searchParams.get('adults');
  const roomQuantity = searchParams.get('roomQuantity');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedHotelOffers, setSelectedHotelOffers] = useState([]);

  useEffect(() => {
    // Only fetch offers if all necessary parameters are available
    if (hotelId && checkInDate && checkOutDate && adults && roomQuantity) {
      handleFetchOffers();
    } else {
      setError("Missing hotel details or dates to fetch offers. Please go back and search again.");
    }
  }, [hotelId, checkInDate, checkOutDate, adults, roomQuantity]); // Re-fetch if these params change

  const handleFetchOffers = async () => {
    setLoading(true);
    setError('');
    setSelectedHotelOffers([]);

    try {
      const queryParams = new URLSearchParams({
        hotelId: hotelId,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        adults: adults.toString(),
        roomQuantity: roomQuantity.toString(),
      }).toString();

      // Call the /api/hotel/offers endpoint
      const response = await fetch(`/api/hotels/offers?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedHotelOffers(data);
        if (data.length === 0) {
            setError(`No offers found for ${hotelName} on selected dates. Try different dates or adjust guest count.`);
        }
      } else {
        setError(data.error || `Failed to fetch offers for ${hotelName}.`);
      }
    } catch (err) {
      console.error("Hotel offers API route error:", err);
      setError(`Network error calling hotel offers API: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Navigate to Booking Page ---
  const handleInitiateBooking = (offerId) => {
    // Pass hotelName as well for display on the booking page
    router.push(`book?offerId=${offerId}&hotelName=${hotelName}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <div><NavigationBarLight /></div>
      <div className="p-8 ">
      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto  rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-6">Offers for {hotelName || 'Selected Hotel'} 💰</h1>

        {error && (
          <p className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</p>
        )}

        {loading && (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {selectedHotelOffers.length > 0 ? (
          <div className="mt-8 space-y-4">
            {selectedHotelOffers.map((offer) => (
              <div key={offer.offerId} className="p-4 border border-slate-200 rounded-lg shadow-sm bg-white flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <p className="font-semibold text-lg text-blue-700">{offer.name}</p> {/* Hotel Name */}
                  
                  {offer.address?.lines?.[0] && (
                    <p className="text-slate-600">
                      {offer.address.lines[0]}, {offer.address.cityName}, {offer.address.countryCode}
                    </p>
                  )}
                  
                  {offer.chainCode && <p className="text-sm text-slate-500">Chain: {offer.chainCode}</p>}
                  
                  {offer.priceBDT && <p className="text-slate-700 font-medium mt-2">Price: {offer.priceBDT} ({offer.originalPrice})</p>}
                  <p className="text-sm text-slate-500">Room Type: {offer.bedType}</p>
                  {offer.roomDescription !== 'N/A' && <p className="text-sm text-slate-500">Room Description: {offer.roomDescription}</p>}
                  <p className="text-sm text-slate-500">Guests: {offer.guests}</p>
                  {offer.bedType !== 'N/A' && <p className="text-sm text-slate-500">Bed Type: {offer.bedType} ({offer.beds} beds)</p>}
                  

                  {offer.rateCode !== 'N/A' && <p className="text-sm text-slate-500">Rate Code: {offer.rateCode}</p>}
                  {offer.refundable !== undefined && (
                    <p className={`text-sm ${offer.refundable ? 'text-green-600' : 'text-red-600'}`}>
                      Refundable: {offer.refundable ? 'Yes' : 'No'}
                    </p>
                  )}
                  {offer.cancellationDeadline !== 'N/A' && (
                      <p className="text-sm text-slate-500">Cancel by: {new Date(offer.cancellationDeadline).toLocaleString()}</p>
                  )}

                  {offer.roomDescription !== 'N/A' && <p className="text-sm text-slate-500 italic mt-2 line-clamp-3">{offer.roomDescription}</p>}
                  
                  {offer.amenities && offer.amenities.length > 0 && (
                    <div className="mt-2 text-sm text-slate-600">
                      <span className="font-medium">Amenities: </span>
                      {offer.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="bg-slate-100 rounded-full px-2 py-0.5 text-xs mr-1">
                          {amenity.description}
                        </span>
                      ))}
                      {offer.amenities.length > 3 && '...'}
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleInitiateBooking(offer.offerId)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
            !loading && error && <p className="text-center text-slate-500 mt-8">{error}</p>
        )}
        {!loading && selectedHotelOffers.length === 0 && !error && (
            <p className="text-center text-slate-500 mt-8">No offers found for this hotel on the selected dates. Try adjusting the dates or guest count.</p>
        )}
      </div>
    </div>
  </div>
  );
}
