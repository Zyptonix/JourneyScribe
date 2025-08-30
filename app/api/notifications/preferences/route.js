// File: app/api/notifications/preferences/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

// This object defines the default state for a new user's notification settings.
// IMPORTANT: The keys here should match the keys in your PREFERENCE_DEFINITIONS on the frontend.
const defaultPreferences = {
    flight_booking_email: true,
    flight_booking_inapp: true,
    hotel_booking_email: true,
    hotel_booking_inapp: true,
    itinerary_event_reminders: true,
    new_blog_comment: true,
    new_chat_message: true,
    new_trip_request: true,
};

// GET handler to fetch current user preferences (with "get-or-create" logic)
export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith("Bearer ")) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const userProfileRef = db.collection('userProfiles').doc(uid);
        const doc = await userProfileRef.get();

        if (!doc.exists) {
            // This case is unlikely for a logged-in user, but good to handle.
            // We can create the profile with the default preferences.
            console.log(`No user profile found for ${uid}. Creating one with default preferences.`);
            await userProfileRef.set({
                // Add any other default profile fields here if necessary
                email: decodedToken.email,
                fullName: decodedToken.name || 'New User',
                notificationPreferences: defaultPreferences
            }, { merge: true });
            return NextResponse.json(defaultPreferences);
        }

        const existingPreferences = doc.data().notificationPreferences;

        if (existingPreferences) {
            // If preferences exist, return them.
            return NextResponse.json(existingPreferences);
        } else {
            // --- THIS IS THE NEW LOGIC ---
            // If the user profile exists but has no preferences, create and save them.
            console.log(`No preferences found for ${uid}. Creating default set.`);
            await userProfileRef.update({
                notificationPreferences: defaultPreferences
            });
            // Return the newly created default preferences.
            return NextResponse.json(defaultPreferences);
        }

    } catch (error) {
        console.error("Error in GET /api/notifications/preferences:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to fetch or create preferences' }), { status: 500 });
    }
}

// POST handler to save new user preferences (Unchanged)
export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith("Bearer ")) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const preferences = await request.json();

        const userProfileRef = db.collection('userProfiles').doc(uid);
        
        await userProfileRef.update({
            notificationPreferences: preferences
        });

        return NextResponse.json({ success: true, message: 'Preferences updated successfully.' });

    } catch (error) {
        console.error("Error saving notification preferences:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to save preferences.' }), { status: 500 });
    }
}