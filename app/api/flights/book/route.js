import { getAmadeusAccessToken } from '@/lib/amadeusToken';

export async function POST(request) {
    try {
        const body = await request.json();
        const { flightOffer, travelers } = body;

        if (!flightOffer || !travelers || travelers.length === 0) {
            return new Response(JSON.stringify({ error: 'Missing flight offer or traveler information.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const token = await getAmadeusAccessToken();

        // Construct the payload for the Amadeus API
        const payload = {
            data: {
                type: 'flight-order',
                flightOffers: [flightOffer],
                travelers: travelers.map((traveler, index) => {
                    const travelerData = {
                        id: (index + 1).toString(),
                        dateOfBirth: traveler.dateOfBirth,
                        name: {
                            firstName: traveler.firstName.toUpperCase(),
                            lastName: traveler.lastName.toUpperCase(),
                        },
                        gender: traveler.gender,
                        contact: {
                            emailAddress: traveler.email,
                            phones: [{
                                deviceType: 'MOBILE',
                                countryCallingCode: traveler.phoneCountryCode,
                                number: traveler.phoneNumber,
                            }]
                        },
                    };

                    // --- FIX: Validate and format passport data before adding it ---
                    if (traveler.passport && traveler.passport.number && traveler.passport.expiryDate && traveler.passport.issuanceCountry && traveler.passport.nationality) {
                        travelerData.documents = [{
                            documentType: 'PASSPORT',
                            number: traveler.passport.number,
                            expiryDate: traveler.passport.expiryDate, // Ensure YYYY-MM-DD format from frontend
                            issuanceCountry: traveler.passport.issuanceCountry.toUpperCase(), // Must be 2-letter code
                            nationality: traveler.passport.nationality.toUpperCase(), // Must be 2-letter code
                            holder: true,
                        }];
                    }
                    
                    return travelerData;
                }),
            },
        };

        const bookingResponse = await fetch('https://test.api.amadeus.com/v1/booking/flight-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const bookingData = await bookingResponse.json();

        if (!bookingResponse.ok) {
            console.error("Amadeus Booking Error:", bookingData);
            console.error("Payload Sent:", JSON.stringify(payload, null, 2));
            
            return new Response(JSON.stringify({ error: bookingData.errors || 'Failed to create flight order.' }), {
                status: bookingResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify(bookingData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('Booking API Route Error:', err.message);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
