// app/api/notifications/subscribe/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin'; // Use the Admin SDK

export async function POST(request) {
    const { type, criteria, channels, enabled } = await request.json();

    // Validate the incoming request body
    if (!type || !channels || !Array.isArray(channels) || channels.length === 0) {
        return new Response(JSON.stringify({ error: 'Missing or invalid required fields: type, channels' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let userId;
    try {
        // Securely verify the user's ID token from the request header
        const authorizationHeader = request.headers.get('Authorization');
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new Error('Authorization header is missing or malformed.');
        }
        const idToken = authorizationHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
    } catch (authError) {
        console.error("Authentication error:", authError.message);
        // If the token is invalid or missing, reject the request. No anonymous fallback.
        return new Response(JSON.stringify({ error: 'Authentication failed. A valid user token is required.' }), { status: 401 });
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // The document ID will be the notification 'type' for easy lookup
    const userPrefsDocRef = db.collection(`artifacts/${appId}/users/${userId}/preferences`).doc(type);

    try {
        // Use set() to create or overwrite the preference document.
        // This is an atomic operation for a single subscription type.
        await userPrefsDocRef.set({
            type,
            criteria: criteria || 'general', // Use provided criteria or a default
            channels,
            enabled: enabled !== undefined ? enabled : true, // Default to true
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, message: 'Notification preference saved.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error saving notification preference:', error);
        return new Response(JSON.stringify({ error: 'Failed to save notification preference.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
