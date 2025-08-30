import { getAmadeusAccessToken } from '@/lib/amadeusToken';
import { db, adminAuth } from '@/lib/firebaseAdmin';

// A helper function to get user notification preferences from Firestore
async function getUserNotificationPreferences(userId) {
    if (!userId) {
        console.log("getUserNotificationPreferences: No userId provided.");
        return {};
    }
    try {
        const userProfileRef = db.collection('userProfiles').doc(userId);
        const doc = await userProfileRef.get();
        if (!doc.exists) {
            console.log(`getUserNotificationPreferences: No profile found for userId: ${userId}`);
            return {}; // No profile, so return empty preferences
        }
        // Return the preferences map, or an empty object if it doesn't exist
        return doc.data().notificationPreferences || {};
    } catch (error) {
        console.error(`Error fetching notification preferences for user ${userId}:`, error);
        return {}; // Return empty on error to prevent crashes
    }
}

// Helper function to send the confirmation email
async function sendConfirmationEmail(bookingData, guestInfo) {
    const primaryGuest = guestInfo[0];
    const bookingDetails = bookingData.data?.hotelBookings?.[0];
    const hotel = bookingDetails?.hotel;
    const offer = bookingDetails?.hotelOffer;
    const confirmationId = bookingData.data?.id;

    if (!primaryGuest || !bookingDetails) {
        console.error("sendConfirmationEmail Error: Missing data for sending email.");
        return;
    }

    const subject = `Your Hotel Booking is Confirmed: ${hotel?.name}`;
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Booking Confirmed!</h2>
            <p>Hello ${primaryGuest.firstName},</p>
            <p>Your stay at <strong>${hotel?.name}</strong> has been successfully booked. Here are your reservation details:</p>
            <hr>
            <p><strong>Confirmation ID:</strong> ${confirmationId}</p>
            <p><strong>Hotel:</strong> ${hotel?.name}</p>
            <p><strong>Check-in Date:</strong> ${offer?.checkInDate}</p>
            <p><strong>Check-out Date:</strong> ${offer?.checkOutDate}</p>
            <p><strong>Total Price:</strong> ${offer?.price?.total} ${offer?.price?.currency}</p>
            <hr>
            <p>Thank you for booking with us!</p>
        </div>
    `;

    try {
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${apiUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: primaryGuest.email,
                subject: subject,
                htmlContent: htmlContent,
            }),
        });
        console.log(`✅ Successfully sent confirmation email to ${primaryGuest.email}`);
    } catch (emailError) {
        console.error("🔴 Failed to send confirmation email:", emailError);
    }
}


// Currency conversion helper (unchanged)
async function convertToBDT(amount, fromCurrency) {
    if (fromCurrency === 'BDT') {
        return parseFloat(amount).toFixed(2);
    }
    try {
        const response = await fetch(`https://hexarate.paikama.co/api/rates/latest/${fromCurrency}?target=BDT`);
        if (!response.ok) return null;
        const json = await response.json();
        if (!json.data || !json.data.mid) return null;
        const rate = json.data.mid;
        return (parseFloat(amount) * rate).toFixed(2);
    } catch (error) {
        console.error('Error during currency conversion fetch:', error.message);
        return null;
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
                travelAgent: { contact: { email: guestInfo[0]?.email || "default@email.com" } },
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
            const offer = bookingData.data?.hotelBookings?.[0]?.hotelOffer;
            if (offer?.price) {
                const priceBDT = await convertToBDT(offer.price.total, offer.price.currency);
                if (priceBDT) offer.price.totalBDT = priceBDT;
            }
            
            const amadeusBookingId = bookingData.data?.id;

            if (amadeusBookingId) {
                try {
                    const dataToSave = {
                        hotelOfferId,
                        guests: guestInfo,
                        paymentDetails,
                        amadeusResponse: bookingData,
                        createdAt: new Date(),
                    };

                    if (uid) {
                        await db.collection("userProfiles").doc(uid).collection("hotelBookings").doc(amadeusBookingId).set(dataToSave);
                    } else {
                        await db.collection("hotelBookings").doc(amadeusBookingId).set(dataToSave);
                    }
                } catch (firestoreErr) {
                    console.error("Firestore Save Error:", firestoreErr);
                }
            } else {
                console.error("Critical: Amadeus booking successful but no ID returned. Firestore save skipped.");
            }

            // --- NOTIFICATION LOGIC WITH LOGGING ---
if (uid) {
        console.log(`✅ User is logged in. Starting notification process for user: ${uid}`);
        const preferences = await getUserNotificationPreferences(uid);
        console.log("✅ User preferences loaded:", preferences);

        const hotelName = bookingData.data?.hotelBookings?.[0]?.hotel?.name || 'your hotel';
        const confirmationId = bookingData.data?.id;

        // 1. Check EMAIL preference
        if (preferences.hotel_booking_email !== false) {
            console.log("📬 Email preference is NOT explicitly false. Attempting to send email...");
            await sendConfirmationEmail(bookingData, guestInfo);
        } else {
            console.log("❌ Email preference is set to false. Skipping email.");
        }

        // 2. Check IN-APP preference
        if (preferences.hotel_booking_inapp !== false) {
            console.log("📱 In-app preference is NOT explicitly false. Attempting to create in-app notification...");
            const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            try {
                await fetch(`${apiUrl}/api/notifications/inapp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: uid,
                        title: 'Hotel Booked!',
                        message: `Your booking at ${hotelName} is confirmed.`,
                        link: `/hotel/confirmation/${confirmationId}`,
                    }),
                });
                console.log("✅ Successfully sent request to create in-app notification.");
            } catch (inAppError) {
                console.error("🔴 Failed to create in-app notification:", inAppError);
            }
        } else {
            console.log("❌ In-app preference is set to false. Skipping in-app notification.");
        }
    } else {
        console.log("👤 User is not logged in (guest booking). Skipping all notifications.");
    }
    // --- END OF NOTIFICATION LOGIC ---

    return new Response(JSON.stringify({
        success: true,
        amadeusResponse: bookingData
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            console.error("Amadeus Hotel Booking API Error:", bookingData);
            return new Response(JSON.stringify({
                success: false,
                error: bookingData.errors?.[0]?.detail || 'Failed to book hotel.',
            }), { status: bookingRes.status, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (err) {
        console.error('API Route Error (Hotel Booking):', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}