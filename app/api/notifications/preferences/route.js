// app/api/notifications/preferences/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin'; // Use the Admin SDK

// --- GET Request: Fetches user preferences ---
export async function GET(request) {
    let userId;
    try {
        // Securely verify the user's token from the request header
        const authorizationHeader = request.headers.get('Authorization');
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new Error('Authorization header is missing or malformed.');
        }
        const idToken = authorizationHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
    } catch (authError) {
        console.error("Authentication error:", authError.message);
        return new Response(JSON.stringify({ error: 'Authentication failed.' }), { status: 401 });
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const prefsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/preferences`);

    try {
        // Fetch all preferences for the user using Admin SDK syntax
        const querySnapshot = await prefsCollectionRef.get();
        const preferences = querySnapshot.docs.map(doc => ({
            // The document ID is the 'type' of the preference
            type: doc.id, 
            ...doc.data()
        }));
        
        return new Response(JSON.stringify(preferences), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch preferences.' }), { status: 500 });
    }
}

// --- PUT Request: Updates a user preference ---
export async function PUT(request) {
    const { type, updates } = await request.json();

    if (!type || !updates || Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: 'Missing required fields: type or updates' }), { status: 400 });
    }

    let userId;
    try {
        // Securely verify the user's token
        const authorizationHeader = request.headers.get('Authorization');
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new Error('Authorization header is missing or malformed.');
        }
        const idToken = authorizationHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
    } catch (authError) {
        console.error("Authentication error:", authError.message);
        return new Response(JSON.stringify({ error: 'Authentication failed.' }), { status: 401 });
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const userPrefsDocRef = db.collection(`artifacts/${appId}/users/${userId}/preferences`).doc(type);

    try {
        // Update the document using Admin SDK syntax
        await userPrefsDocRef.update({
            ...updates,
            updatedAt: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, message: 'Preference updated.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating notification preference:', error);
        // Handle case where the document might not exist yet
        if (error.code === 5) { // Firestore 'NOT_FOUND' error code
             return new Response(JSON.stringify({ error: 'Preference not found. Cannot update.' }), { status: 404 });
        }
        return new Response(JSON.stringify({ error: 'Failed to update preference.' }), { status: 500 });
    }
}
