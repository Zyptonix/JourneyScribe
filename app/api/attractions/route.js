// app/api/attractions/route.js
import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed


export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId'); // For a specific POI search
    const latitude = searchParams.get('latitude');     // For searching POIs in an area
    const longitude = searchParams.get('longitude');   // For searching POIs in an area

    if (!locationId && (!latitude || !longitude)) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: locationId OR latitude and longitude' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();

        const attractionsUrl = new URL('https://test.api.amadeus.com/v1/shopping/activities');
            attractionsUrl.searchParams.set('latitude', latitude);
            attractionsUrl.searchParams.set('longitude', longitude);
            attractionsUrl.searchParams.set('radius', '5'); // Search within 5km radius
        const response = await fetch(attractionsUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Amadeus Attractions API Error:", data);
            return new Response(JSON.stringify({ error: data.errors?.[0]?.detail || 'Failed to fetch attractions' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Simplify and return relevant attraction info
        const attractions = (data.data || []).map(attraction => ({
            name: attraction.name,
            id: attraction.id,
            category: attraction.category,
            // Use subcategories if available, otherwise just categories
            description: attraction.description?.text || 'No description available.',
            latitude: attraction.geoCode?.latitude || null,
            longitude: attraction.geoCode?.longitude || null,
            // Check if tags exist before mapping
            tags: attraction.tags && attraction.tags.length > 0 ? attraction.tags.map(tag => tag.name) : [] 
        }));

        return new Response(JSON.stringify(attractions), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('API Route Error (Attractions):', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
