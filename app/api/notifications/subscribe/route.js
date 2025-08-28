// app/api/notifications/subscribe/route.js

import { initializeApp } from 'firebase/app';
import {db , auth} from '@/lib/firebaseClient'; // Adjust path as needed
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, collection } from 'firebase/firestore';


// Helper function to get authenticated user ID
async function getAuthenticatedUserId() {
    if (typeof __initial_auth_token !== 'undefined') {
        await signInWithCustomToken(auth, __initial_auth_token);
    } else {
        // Fallback to anonymous sign-in if no initial token (e.g., for testing or unauthenticated users)
        await signInAnonymously(auth);
    }
    return auth.currentUser?.uid || crypto.randomUUID(); // Use auth UID or a random ID
}

export async function POST(request) {
    const { type, criteria, channels, enabled } = await request.json();

    if (!type || !criteria || !channels) {
        return new Response(JSON.stringify({ error: 'Missing required fields: type, criteria, channels' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let userId;
    try {
        userId = await getAuthenticatedUserId();
    } catch (authError) {
        console.error("Authentication error:", authError);
        return new Response(JSON.stringify({ error: 'Authentication failed.' }), { status: 401 });
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // Path for user-specific notification preferences
    const userPrefsDocRef = doc(db, `artifacts/${appId}/users/${userId}/preferences`, type); 

    try {
        // Use setDoc with merge:true to create or update the preference
        await setDoc(userPrefsDocRef, {
            type,
            criteria,
            channels,
            enabled: enabled !== undefined ? enabled : true, // Default to true if not provided
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return new Response(JSON.stringify({ success: true, message: 'Notification preference saved.', userId, type }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error saving notification preference:', error);
        return new Response(JSON.stringify({ error: 'Failed to save notification preference.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
