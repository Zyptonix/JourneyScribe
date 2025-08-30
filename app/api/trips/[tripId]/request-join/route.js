// File: app/api/trips/[tripId]/request-join/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

// Helper function to get user notification preferences
async function getUserNotificationPreferences(userId) {
    if (!userId) return {};
    const userProfileRef = db.collection('userProfiles').doc(userId);
    const doc = await userProfileRef.get();
    if (!doc.exists) {
        console.log(`[Debug] No profile found for userId: ${userId} while fetching preferences.`);
        return {};
    }
    return doc.data().notificationPreferences || {};
}

export async function POST(request, { params }) {
    const { tripId } = params;
    console.log(`[API START] Received join request for tripId: ${tripId}`);

    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith("Bearer ")) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const requesterId = decodedToken.uid;
        
        const requesterProfileDoc = await db.collection('userProfiles').doc(requesterId).get();
        
        // FIX: Use the .exists property (boolean) instead of the .exists() function.
        const requesterName = requesterProfileDoc.exists ? requesterProfileDoc.data().fullName : 'A new user';
        
        console.log(`[AUTH SUCCESS] Requester authenticated: ${requesterName} (${requesterId})`);

        const appId = 'default-app-id'; 
        const tripRef = db.collection(`artifacts/${appId}/public/data/trips`).doc(tripId);
        const tripDoc = await tripRef.get();

        if (!tripDoc.exists) {
            console.error(`[DB ERROR] Trip with ID ${tripId} not found.`);
            return new NextResponse(JSON.stringify({ error: 'Trip not found.' }), { status: 404 });
        }

        const tripData = tripDoc.data();
        const ownerId = tripData.userId;
        const tripLocation = tripData.location;
        console.log(`[DB SUCCESS] Found trip document. Owner is: ${ownerId}`);

        console.log(`[DB UPDATE] Adding requester ${requesterId} to 'requests' array...`);
        await tripRef.update({
            requests: FieldValue.arrayUnion(requesterId)
        });
        console.log('[DB UPDATE] Successfully updated trip document.');

        const ownerPreferences = await getUserNotificationPreferences(ownerId);
        console.log(`[PREFERENCES] Fetched owner's preferences:`, ownerPreferences);

        if (ownerPreferences.new_trip_request !== false) {
            console.log(`[NOTIFICATION] ✅ Preference is ON. Sending notification to owner ${ownerId}.`);
            const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${apiUrl}/api/notifications/inapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: ownerId,
                    title: 'New Join Request',
                    message: `${requesterName} wants to join your trip to ${tripLocation}.`,
                    link: `/trips/${tripId}`,
                }),
            }).catch(err => console.error(`[NOTIFICATION ERROR] Failed to send notification to ${ownerId}:`, err));
        } else {
            console.log(`[NOTIFICATION] ❌ Preference is OFF for owner ${ownerId}. Skipping notification.`);
        }

        console.log('[API END] Process complete. Sending success response.');
        return NextResponse.json({ success: true, message: 'Request sent successfully.' });

    } catch (error) {
        console.error("🔴 [API CRITICAL ERROR] An unexpected error occurred:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to process request.' }), { status: 500 });
    }
}