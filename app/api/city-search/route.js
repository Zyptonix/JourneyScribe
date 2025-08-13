// app/api/city-search/route.js (for Next.js App Router)
// or pages/api/city-search.js (for Next.js Pages Router)

import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed
import { fetchWithBackoff } from '@/utils/fetchWithBackoff'; // Import the new utility

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (!keyword || keyword.length < 2) { // Require at least 2 characters for search
        return new Response(JSON.stringify([]), { // Return empty array for short keywords
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();

        // Use Amadeus City Search API (Airport & City Search API)
        const citySearchUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/cities');
        citySearchUrl.searchParams.set('keyword', keyword);
        
        // Use fetchWithBackoff for the Amadeus API call
        const response = await fetch(citySearchUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Amadeus City Search API Error:", data);
            return new Response(JSON.stringify({ error: data.errors?.[0]?.detail || 'Failed to fetch city suggestions' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Simplify and return only relevant city info for suggestions
        const cities = (data.data || []).map(city => ({
            name: city.name,
            iataCode: city.iataCode
        }));

        return new Response(JSON.stringify(cities), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('API Route Error (City Search):', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
