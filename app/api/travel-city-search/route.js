// In /app/api/travel-city-search/route.js

import { NextResponse } from 'next/server';
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    if (keyword.length < 2) {
        return NextResponse.json([]);
    }

    try {
        const token = await getAmadeusAccessToken();
        const citySearchUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/cities');
        citySearchUrl.searchParams.set('keyword', keyword);
        citySearchUrl.searchParams.set('include', 'AIRPORTS'); // Ensures we get airport data which is often more precise

        const response = await fetch(citySearchUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Amadeus City Search API Error:", data);
            const errorMessage = data.errors?.[0]?.detail || 'Failed to fetch city suggestions';
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        // Map the response to include the crucial geoCode object
        const cities = (data.data || []).map(city => ({
            name: city.name,
            iataCode: city.iataCode,
            geoCode: city.geoCode // This object contains latitude and longitude
        }));

        return NextResponse.json(cities);

    } catch (err) {
        console.error('API Route Error (Travel City Search):', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
