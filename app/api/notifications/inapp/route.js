// app/api/notifications/inapp/route.js

// REMOVED: No longer need client-side Firestore functions
// import { collection, query, getDocs, limit, startAfter, doc, getDoc } from 'firebase/firestore'; 

// CORRECT: Import the Admin SDK instances
import { db, adminAuth } from '@/lib/firebaseAdmin';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const limitCount = parseInt(searchParams.get('limit') || '10', 10);
    const lastDocId = searchParams.get('lastDocId');

    let userId;
    try {
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

    try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        // 1. Get collection reference using Admin SDK syntax
        const notificationsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/notifications`);

        // 2. Create the base query using chainable Admin SDK methods
        // NOTE: You need a 'timestamp' field in your documents for this to work.
        // If you don't have one, you can order by another field or remove orderBy.
        let q = notificationsCollectionRef.orderBy('timestamp', 'desc');

        // 3. Handle pagination if lastDocId is provided
        if (lastDocId) {
            const lastDocSnapshot = await notificationsCollectionRef.doc(lastDocId).get();
            if (!lastDocSnapshot.exists) {
                return new Response(JSON.stringify({ message: 'Last document not found.' }), { status: 404 });
            }
            q = q.startAfter(lastDocSnapshot);
        }

        // 4. Add the limit and execute the query with .get()
        const querySnapshot = await q.limit(limitCount).get();

        if (querySnapshot.empty) {
            return new Response(JSON.stringify({ notifications: [], hasMore: false, lastDocId: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const notifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const hasMore = notifications.length === limitCount;
        const newLastDocId = hasMore ? querySnapshot.docs[querySnapshot.docs.length - 1].id : null;

        return new Response(JSON.stringify({ notifications, hasMore, lastDocId: newLastDocId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch notifications.' }), { status: 500 });
    }
}