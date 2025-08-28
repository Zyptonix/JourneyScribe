import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed

export async function POST(request) {
    const { guestInfo, hotelOfferId, paymentDetails } = await request.json();
    console.log(paymentDetails)
    // Basic validation
    if (!guestInfo || guestInfo.length === 0 || !hotelOfferId || !paymentDetails) {
        return new Response(JSON.stringify({ error: 'Missing required booking details (guestInfo, hotelOfferId, paymentDetails)' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();
        
        // Construct the booking request body as per Amadeus Hotel Booking API
        const bookingRequestBody = {
            data: {
                type: 'hotel-order',
                guests: guestInfo.map((guest, index) => ({
                    // Assign a simple tid for each guest
                    tid: index + 1, 
                    title: guest.title,
                    firstName: guest.firstName,
                    lastName: guest.lastName,
                    phone: guest.phone,
                    email: guest.email,
                })),
                // Travel agent info can be simplified or omitted if not relevant
                travelAgent: {
                    contact: {
                        email: guestInfo[0]?.email || "default@email.com" // Use first guest's email or a default
                    }
                },
                roomAssociations: [
                    {
                        guestReferences: guestInfo.map((_, index) => ({
                            guestReference: (index + 1).toString()
                        })),
                        hotelOfferId: hotelOfferId
                    }
                ],
                payment: {
                    method: paymentDetails.method,
                    paymentCard: {
                        paymentCardInfo: {
                            vendorCode: paymentDetails.paymentCard.paymentCardInfo.vendorCode, // e.g., "VI" for Visa, "MC" for Mastercard
                            cardNumber: paymentDetails.paymentCard.paymentCardInfo.cardNumber,
                            expiryDate: paymentDetails.paymentCard.paymentCardInfo.expiryDate, // YYYY-MM
                            holderName: paymentDetails.paymentCard.paymentCardInfo.holderName
                        }
                    }
                }
            }
        };

        const amadeusBookingUrl = 'https://test.api.amadeus.com/v2/booking/hotel-orders';

        const bookingRes = await fetch(amadeusBookingUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-HTTP-Method-Override': 'POST' // Might be needed for some Amadeus endpoints
            },
            body: JSON.stringify(bookingRequestBody)
        });

        const bookingData = await bookingRes.json();

        if (bookingRes.ok) {
            // Booking successful
            return new Response(JSON.stringify({
                success: true,
                message: 'Hotel booked successfully!',
                bookingId: bookingData.data?.id,
                status: bookingData.data?.status,
                hotelName: bookingData.data?.hotel?.name, // Extract relevant details
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Booking failed
            console.error("Amadeus Hotel Booking API Error:", bookingData);
            return new Response(JSON.stringify({
                success: false,
                error: bookingData.errors?.[0]?.detail || 'Failed to book hotel. Please check details.',
                amadeusResponse: bookingData // Include full Amadeus response for debugging
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
