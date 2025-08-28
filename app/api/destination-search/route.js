// app/api/location-search/route.js
import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed
import { fetchWithBackoff } from '@/utils/fetchWithBackoff'; // Import the new utility

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (!keyword || keyword.length < 2) { // Require at least 2 characters for search
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();

        // Use Amadeus Airport & City Search API (v1/reference-data/locations)
        const locationSearchUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations');
        locationSearchUrl.searchParams.set('keyword', keyword);
        // Search for Cities, Airports, and Points of Interest
        locationSearchUrl.searchParams.set('subType', 'CITY,AIRPORT'); 


        const response = await fetchWithBackoff(locationSearchUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Amadeus Location Search API Error:", data);
            return new Response(JSON.stringify({ error: data.errors?.[0]?.detail || 'Failed to fetch location suggestions' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Simplify and return only relevant location info for suggestions
        const locations = (data.data || []).map(loc => ({
            name: loc.name,
            id: loc.id, // Unique ID for POIs or Cities
            type: loc.subType, // CITY, AIRPORT, POINT_OF_INTEREST
            iataCode: loc.iataCode || null, // Only for CITY/AIRPORT
            latitude: loc.geoCode?.latitude || null,
            longitude: loc.geoCode?.longitude || null,
            address: loc.address || null // Address might be useful for POIs
        }));

        return new Response(JSON.stringify(locations), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('API Route Error (Location Search):', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
