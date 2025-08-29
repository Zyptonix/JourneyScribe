import { getAmadeusAccessToken } from '@/lib/amadeusToken';
import { db, adminAuth } from '@/lib/firebaseAdmin';

// --- Helper function to format dates and times for the email ---
const formatDate = (dateTime) => new Date(dateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const formatTime = (dateTime) => new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

// --- Helper function to send the flight confirmation email ---
async function sendFlightConfirmationEmail(bookingData) {
    const primaryTraveler = bookingData.data?.travelers?.[0];
    const flightOffer = bookingData.data?.flightOffers?.[0];
    const confirmationId = bookingData.data?.associatedRecords?.[0]?.reference;

    if (!primaryTraveler || !flightOffer || !confirmationId) {
        console.error("Missing data for sending flight confirmation email.");
        return;
    }

    const subject = `Your Flight Booking is Confirmed: PNR ${confirmationId}`;
    
    // Create a list of travelers
    const travelerList = bookingData.data.travelers.map(t => `<li>${t.name.firstName} ${t.name.lastName}</li>`).join('');

    // Create the itinerary details
    const itineraryDetails = flightOffer.itineraries.map((itinerary, index) => {
        const header = index === 0 ? '<h4>Outbound Flight</h4>' : '<h4>Return Flight</h4>';
        const segments = itinerary.segments.map(segment => `
            <p>
                <strong>${segment.departure.iataCode} to ${segment.arrival.iataCode}</strong> (${segment.carrierCode} ${segment.number})<br>
                Departs: ${formatDate(segment.departure.at)} at ${formatTime(segment.departure.at)}<br>
                Arrives: ${formatDate(segment.arrival.at)} at ${formatTime(segment.arrival.at)}
            </p>
        `).join('');
        return header + segments;
    }).join('<hr>');

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Your Flight Booking is Confirmed!</h2>
            <p>Hello ${primaryTraveler.name.firstName},</p>
            <p>Your flight has been successfully booked. Please find your reservation details below.</p>
            <hr>
            <h3>Booking Reference (PNR): <strong>${confirmationId}</strong></h3>
            <h3>Travelers:</h3>
            <ul>${travelerList}</ul>
            <hr>
            <h3>Itinerary:</h3>
            ${itineraryDetails}
            <hr>
            <p>Thank you for booking with us! Please remember to check in with the airline 24 hours before your departure.</p>
        </div>
    `;

    try {
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        await fetch(`${apiUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: primaryTraveler.contact.emailAddress,
                subject: subject,
                htmlContent: htmlContent,
            }),
        });
    } catch (emailError) {
        console.error("Failed to send flight confirmation email:", emailError);
    }
}


export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization');
        let uid = null;

        if (authHeader?.startsWith("Bearer ")) {
            const idToken = authHeader.split("Bearer ")[1];
            try {
                const decoded = await adminAuth.verifyIdToken(idToken);
                uid = decoded.uid;
            } catch (err) {
                console.error("Token verification failed:", err);
            }
        }
        const body = await request.json();
        const { flightOffer, travelers } = body;

        if (!flightOffer || !travelers || travelers.length === 0) {
            return new Response(JSON.stringify({ error: 'Missing flight offer or traveler information.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const token = await getAmadeusAccessToken();

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
                    if (traveler.passport && traveler.passport.number && traveler.passport.expiryDate && traveler.passport.issuanceCountry && traveler.passport.nationality) {
                        travelerData.documents = [{
                            documentType: 'PASSPORT',
                            number: traveler.passport.number,
                            expiryDate: traveler.passport.expiryDate,
                            issuanceCountry: traveler.passport.issuanceCountry.toUpperCase(),
                            nationality: traveler.passport.nationality.toUpperCase(),
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

        const bookingRef = bookingData?.data?.associatedRecords?.[0]?.reference;

        try {
            if (bookingRef) {
                const dataToSave = {
                    travelers: bookingData?.data?.travelers || [],
                    flightOffers: bookingData?.data?.flightOffers || [],
                    raw: bookingData,
                    createdAt: new Date(),
                };

                if (uid) {
                    await db.collection("userProfiles").doc(uid).collection("bookings").doc(bookingRef).set(dataToSave);
                } else {
                    await db.collection("flightBookings").doc(bookingRef).set(dataToSave);
                }
            } else {
                console.error("Amadeus booking successful but no reference ID was returned. Firestore save skipped.");
            }
        } catch (firestoreErr) {
            console.error("Firestore Save Error:", firestoreErr);
        }

        // --- SEND CONFIRMATION EMAIL ---
        await sendFlightConfirmationEmail(bookingData);
        // --- END OF EMAIL LOGIC ---

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