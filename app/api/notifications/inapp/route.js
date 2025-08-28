// app/api/notifications/inapp/route.js

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, getDocs, limit, startAfter, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient'; // Adjust path as needed

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
    const limitCount = parseInt(searchParams.get('limit') || '10', 10);
    const lastDocId = searchParams.get('lastDocId');

    let userId;
    try {
        userId = await getAuthenticatedUserId();
    } catch (authError) {
        console.error("Authentication error:", authError);
        return new Response(JSON.stringify({ error: 'Authentication failed.' }), { status: 401 });
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const notificationsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);

    try {
        let q;
        if (lastDocId) {
            // No orderBy for pagination with startAfter directly (Firestore limitation without index)
            // For simple pagination, orderBy is implied by 'document ID' for startAfter if no other order is set.
            // If explicit ordering is needed (e.g., by timestamp), you would add `orderBy('timestamp', 'desc')` here,
            // and ensure an index exists. For this example, we'll keep it simple as Firestore default queries.
            const lastDocSnapshot = await getDocs(query(notificationsCollectionRef, limit(1), doc(notificationsCollectionRef, lastDocId)));
            if (lastDocSnapshot.empty) {
                return new Response(JSON.stringify({ notifications: [], message: 'Last document not found for pagination.' }), {
                    status: 404, headers: { 'Content-Type': 'application/json' }
                });
            }
            q = query(notificationsCollectionRef, startAfter(lastDocSnapshot.docs[0]), limit(limitCount));
        } else {
            q = query(notificationsCollectionRef, limit(limitCount));
        }

        const querySnapshot = await getDocs(q);
        const notifications = [];
        querySnapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        // Determine if there are more notifications for further pagination
        const hasMore = querySnapshot.docs.length === limitCount;
        const newLastDocId = hasMore ? querySnapshot.docs[querySnapshot.docs.length - 1].id : null;

        return new Response(JSON.stringify({ notifications, hasMore, lastDocId: newLastDocId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching in-app notifications:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch in-app notifications.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
