
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    
    // FIX: Explicitly convert the keyword to a string to ensure correct type.
    // This handles cases where the parameter might be null or have an unexpected type.
    const keyword = String(searchParams.get('keyword') || '');

    // The existing check for keyword length is still useful.
    if (keyword.length < 2) {
        return new Response(JSON.stringify([]), {


            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();
        const citySearchUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/cities');
        citySearchUrl.searchParams.set('keyword', keyword);
        

        const response = await fetch(citySearchUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Amadeus City Search API Error:", data);

            // The error message you are seeing likely comes from here.
            const errorMessage = data.errors?.[0]?.detail || 'Failed to fetch city suggestions';
            return new Response(JSON.stringify({ error: errorMessage }), {

                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }


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
