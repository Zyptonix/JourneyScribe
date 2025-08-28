import { getAmadeusAccessToken } from '@/lib/amadeusToken';

export async function POST(request) {
    try {
        const body = await request.json();
        const { flightOffer } = body;

        if (!flightOffer) {
            return new Response(JSON.stringify({ error: 'Missing flight offer.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const token = await getAmadeusAccessToken();

        // The payload for the pricing API is the flight offer itself,
        // wrapped in a data object.
        const payload = {
            data: {
                type: 'flight-offers-pricing',
                flightOffers: [flightOffer],
            },
        };

        const pricingResponse = await fetch('https://test.api.amadeus.com/v1/shopping/flight-offers/pricing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const pricingData = await pricingResponse.json();

        if (!pricingResponse.ok) {
            console.error("Amadeus Pricing Error:", pricingData);
            return new Response(JSON.stringify({ errors: pricingData.errors || [{ detail: 'Failed to re-price flight offer.' }] }), {
                status: pricingResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Return the fresh, updated flight offer
        // It's nested inside the 'flightOffers' array in the response
        return new Response(JSON.stringify(pricingData.data.flightOffers[0]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('Pricing API Route Error:', err.message);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
