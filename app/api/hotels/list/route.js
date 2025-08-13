import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken';
import { fetchWithBackoff } from '@/utils/fetchWithBackoff'; // Import the new utility

// Re-using the convertToBDT function from other API routes
// This function is still included here for completeness, though it's primarily used in /api/hotel/offers now.
async function convertToBDT(amount, fromCurrency) {
    const maxRetries = 5;
    let retries = 0;
    while (retries < maxRetries) {
        try {
            // Note: If convert-currency API is also rate-limited, you might need to apply backoff there too.
            const res = await fetch(`http://localhost:9243/api/convert-currency?to=BDT&amount=${amount}&from=${fromCurrency}`);
            const json = await res.json();

            if (!res.ok || !json.success) {
                console.warn(`Currency conversion failed (attempt ${retries + 1}):`, json.error || res.statusText);
                throw new Error(json.error || 'Conversion failed');
            }
            return Math.round(json.convertedAmount);
        } catch (error) {
            if (retries < maxRetries - 1) {
                const delay = Math.pow(2, retries) * 1000;
                console.log(`Retrying currency conversion in ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error;
            }
        }
        retries++;
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get('cityCode');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1';
    const roomQuantity = searchParams.get('roomQuantity') || '1';

    if (!cityCode || !checkInDate || !checkOutDate) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: cityCode, checkInDate, checkOutDate' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken(); // Still need a token for the initial Amadeus call

        // 1. Fetch initial list of hotels by city from Amadeus v1 API
       
        const hotelListUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city');
        hotelListUrl.searchParams.set('cityCode', cityCode);
        hotelListUrl.searchParams.set('radius', '5'); // Search within 5km radius
        hotelListUrl.searchParams.set('radiusUnit', 'KM');
        hotelListUrl.searchParams.set('hotelSource', 'ALL');
        // Removed: hotelListUrl.searchParams.set('page[limit]', '20'); as it's not supported by this API

        // Use fetchWithBackoff for the Amadeus API call
        const listResponse = await fetchWithBackoff(hotelListUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const initialHotelsJson = await listResponse.json();

        if (!listResponse.ok) {
           
            return new Response(JSON.stringify({ error: initialHotelsJson.errors?.[0]?.detail || 'Failed to fetch initial hotel list from Amadeus' }), {
                status: listResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let initialHotels = initialHotelsJson.data || [];
        // Manually limit the number of hotels to 30 after fetching
        initialHotels = initialHotels.slice(0, 30);

        

        // 2. Filter hotels by checking for available offers using our internal /api/hotel/offers route
        // This will call /api/hotel/offers, which itself uses fetchWithBackoff for its Amadeus call.
       
        const hotelsWithOffersPromises = initialHotels.map(async (hotel) => {
            try {
                // Add a small proactive delay here to space out requests
                // This helps avoid hitting the "1 request every 50ms" limit too quickly.
                await new Promise(res => setTimeout(res, 100)); // Delay of 100ms

                // Call our own /api/hotel/offers route and use fetchWithBackoff
                const offersApiUrl = new URL(`http://localhost:9243/api/hotels/offers`); // Adjust port if necessary
                offersApiUrl.searchParams.set('hotelId', hotel.hotelId);
                offersApiUrl.searchParams.set('checkInDate', checkInDate);
                offersApiUrl.searchParams.set('checkOutDate', checkOutDate);
                offersApiUrl.searchParams.set('adults', adults);
                offersApiUrl.searchParams.set('roomQuantity', roomQuantity);

                // Using fetchWithBackoff for the internal call to /api/hotel/offers
                const offersResponse = await fetchWithBackoff(offersApiUrl.toString()); 
                const offersData = await offersResponse.json();

                if (offersResponse.ok && offersData && offersData.length > 0) {
                   
                    return {
                        hotelId: hotel.hotelId || 'N/A',
                        name: hotel.name || 'Unknown Hotel',
                        cityName: hotel.address?.cityName || 'N/A',
                        cityCode: hotel.cityCode,
                        latitude: hotel.geoCode?.latitude || null,
                        longitude: hotel.geoCode?.longitude || null,
                        hasOffers: true,
                    };
                } else {
                    
                    return null; // No offers found for this hotel
                }
            } catch (offerError) {
                return null; // Treat errors during offer check as no offers
            }
        });

        const hotelsWithOffers = (await Promise.all(hotelsWithOffersPromises)).filter(Boolean); // Filter out nulls

        

        return new Response(JSON.stringify(hotelsWithOffers), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
       
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
