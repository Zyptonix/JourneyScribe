
import { getAmadeusAccessToken } from '@/lib/amadeusToken';
import { fetchWithBackoff } from '@/utils/fetchWithBackoff';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // --- Read all search parameters from the request ---
    const cityCode = searchParams.get('cityCode');
    const ratings = searchParams.get('ratings');
    const amenities = searchParams.get('amenities');
    const radius = searchParams.get('radius');
    const radiusUnit = searchParams.get('radiusUnit');

    if (!cityCode) {
        return new Response(JSON.stringify({ error: 'Missing required parameter: cityCode' }), {

            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {

        const token = await getAmadeusAccessToken();

        // --- Fetch the list of hotels using all provided filters ---
        const hotelListUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city');
        hotelListUrl.searchParams.set('cityCode', cityCode);
        hotelListUrl.searchParams.set('hotelSource', 'ALL');
        hotelListUrl.searchParams.set('radius', radius || '10'); // Default to 10km if not provided
        hotelListUrl.searchParams.set('radiusUnit', radiusUnit || 'KM');

        if (ratings) {
            hotelListUrl.searchParams.set('ratings', ratings);
        }
        if (amenities) {
            hotelListUrl.searchParams.set('amenities', amenities);
        }


        const listResponse = await fetchWithBackoff(hotelListUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });


        const hotelsJson = await listResponse.json();

        if (!listResponse.ok) {
            return new Response(JSON.stringify({ error: hotelsJson.errors?.[0]?.detail || 'Failed to fetch hotel list' }), {

                status: listResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }


        // --- Directly return the list of hotels without checking for offers ---
        // This makes the API significantly faster.
        return new Response(JSON.stringify(hotelsJson.data || []), {

            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {

        console.error("Hotel List API Error:", err.message);
        return new Response(JSON.stringify({ error: "An internal server error occurred." }), {

            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
