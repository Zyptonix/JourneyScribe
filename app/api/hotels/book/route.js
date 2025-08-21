
import { getAmadeusAccessToken } from '@/lib/amadeusToken';

async function convertToBDT(amount, fromCurrency) {
    // If the currency is already BDT, no need to convert
    if (fromCurrency === 'BDT') {
        return parseFloat(amount).toFixed(2);
    }

    try {
        // Using the HexaRate API endpoint
        const response = await fetch(`https://hexarate.paikama.co/api/rates/latest/${fromCurrency}?target=BDT`);
        if (!response.ok) {
            console.error(`Currency conversion API failed with status: ${response.status}`);
            return null; // Return null on failure to avoid breaking the main request
        }
        
        const json = await response.json();
        if (!json.data || !json.data.mid) {
            console.error('Rate data missing from currency API response');
            return null;
        }

        const rate = json.data.mid;
        return (parseFloat(amount) * rate).toFixed(2);

    } catch (error) {
        console.error('Error during currency conversion fetch:', error.message);
        return null; // Return null on error
    }
}



export async function POST(request) {
    const { guestInfo, hotelOfferId, paymentDetails } = await request.json();

    if (!guestInfo || guestInfo.length === 0 || !hotelOfferId || !paymentDetails) {
        return new Response(JSON.stringify({ error: 'Missing required booking details' }), {

            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();
        

        const bookingRequestBody = {
            data: {
                type: 'hotel-order',
                guests: guestInfo.map((guest, index) => ({

                    tid: index + 1,

                    title: guest.title,
                    firstName: guest.firstName,
                    lastName: guest.lastName,
                    phone: guest.phone,
                    email: guest.email,
                })),

                travelAgent: {
                    contact: { email: guestInfo[0]?.email || "default@email.com" }
                },
                roomAssociations: [{
                    hotelOfferId: hotelOfferId,
                    guestReferences: guestInfo.map((_, index) => ({ guestReference: (index + 1).toString() }))
                }],
                payment: {
                    method: paymentDetails.method,
                    paymentCard: { paymentCardInfo: paymentDetails.paymentCard.paymentCardInfo }

                }
            }
        };

        const amadeusBookingUrl = 'https://test.api.amadeus.com/v2/booking/hotel-orders';

        const bookingRes = await fetch(amadeusBookingUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',

                'X-HTTP-Method-Override': 'POST'

            },
            body: JSON.stringify(bookingRequestBody)
        });

        const bookingData = await bookingRes.json();

        if (bookingRes.ok) {

            // --- FIX: Convert currency after successful booking ---
            const offer = bookingData.data?.hotelBookings?.[0]?.hotelOffer;
            if (offer?.price) {
                const priceBDT = await convertToBDT(offer.price.total, offer.price.currency);
                if (priceBDT) {
                    offer.price.totalBDT = priceBDT;
                }
            }
            
            return new Response(JSON.stringify({
                success: true,
                amadeusResponse: bookingData

            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {

            console.error("Amadeus Hotel Booking API Error:", bookingData);
            return new Response(JSON.stringify({
                success: false,
                error: bookingData.errors?.[0]?.detail || 'Failed to book hotel.',

            }), {
                status: bookingRes.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (err) {
        console.error('API Route Error (Hotel Booking):', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
