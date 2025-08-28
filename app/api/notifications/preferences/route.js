// app/api/notifications/preferences/route.js

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore,updateDoc, doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import {db,auth} from '@/lib/firebaseClient'; // Adjust path as needed


// Helper function to get authenticated user ID
async function getAuthenticatedUserId() {
    if (typeof __initial_auth_token !== 'undefined') {
        await signInWithCustomToken(auth, __initial_auth_token);
    } else {
        await signInAnonymously(auth);
    }
    return auth.currentUser?.uid || crypto.randomUUID();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Optional: filter by notification type

    let userId;
    try {
        userId = await getAuthenticatedUserId();
    } catch (authError) {
        console.error("Authentication error:", authError);
        return new Response(JSON.stringify({ error: 'Authentication failed.' }), { status: 401 });
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const prefsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/preferences`);

    try {
        if (type) {
            // Fetch a single preference by type
            const docRef = doc(prefsCollectionRef, type);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return new Response(JSON.stringify(docSnap.data()), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({ message: 'Preference not found.' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            // Fetch all preferences for the user
            const q = query(prefsCollectionRef);
            const querySnapshot = await getDocs(q);
            const preferences = [];
            querySnapshot.forEach((doc) => {
                preferences.push(doc.data());
            });
            return new Response(JSON.stringify(preferences), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch notification preferences.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function PUT(request) {
    const { type, updates } = await request.json();

    if (!type || !updates || Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: 'Missing required fields: type or updates' }), {
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
    const userPrefsDocRef = doc(db, `artifacts/${appId}/users/${userId}/preferences`, type); 

    try {
        await updateDoc(userPrefsDocRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, message: 'Notification preference updated.', userId, type }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error updating notification preference:', error);
        return new Response(JSON.stringify({ error: 'Failed to update notification preference.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}