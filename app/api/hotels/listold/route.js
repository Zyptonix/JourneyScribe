import fetch from 'node-fetch'; // If using Node.js environment directly
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get('cityCode');

    if (!cityCode) {
        return new Response(JSON.stringify({ error: 'Missing cityCode parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();

        // Use the Amadeus Hotel List API (v1) to get basic hotel metadata
        const hotelListUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city');
        hotelListUrl.searchParams.set('cityCode', cityCode);
        hotelListUrl.searchParams.set('radius', '5'); // Search within 5km radius
        hotelListUrl.searchParams.set('radiusUnit', 'KM');
        hotelListUrl.searchParams.set('hotelSource', 'ALL'); // Include all sources if available
    

        const hotelsRes = await fetch(hotelListUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const hotelsJson = await hotelsRes.json();

        if (!hotelsRes.ok) {
            console.error("Amadeus Hotel List API Error:", hotelsJson);
            return new Response(JSON.stringify({ error: hotelsJson.errors?.[0]?.detail || 'Failed to fetch hotel list from Amadeus' }), {
                status: hotelsRes.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Simplify and select important info for the hotel list
        const simplifiedHotels = (hotelsJson.data || []).map(hotel => ({
            hotelId: hotel.hotelId || 'N/A',
            name: hotel.name || 'Unknown Hotel',
            cityName: hotel.address?.cityName || 'N/A',
            latitude: hotel.geoCode?.latitude || null,
            longitude: hotel.geoCode?.longitude || null,
            // Distance is not directly provided in by-city, would need calculation if relevant
        }));

        return new Response(JSON.stringify(simplifiedHotels), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('API Route Error (Hotel List):', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
