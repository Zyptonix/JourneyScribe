// File: app/api/notifications/inapp/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

// --- POST: Creates a new in-app notification ---
export async function POST(request) {
    try {
        // Note: In a server-to-server call like this, we trust the caller.
        // We get the userId from the body instead of an auth token.
        const { userId, title, message, link, type } = await request.json();

        if (!userId || !title || !message) {
            return new NextResponse(JSON.stringify({ error: 'Missing required fields: userId, title, message' }), { status: 400 });
        }

        // CORRECT PATH: The path the dropdown component is listening to.
        const notificationRef = db.collection('userProfiles').doc(userId).collection('inapp');

        await notificationRef.add({
            title,
            message,
            link: link || null, // Optional link
            type: type || 'general', // Optional type for categorization
            read: false, // CRITICAL: Always create notifications as unread
            timestamp: FieldValue.serverTimestamp(), // Use server timestamp for correct ordering
        });

        return NextResponse.json({ success: true, message: 'Notification created.' });

    } catch (error) {
        console.error('Error creating in-app notification:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to create notification.' }), { status: 500 });
    }
}


// --- GET: Fetches a list of notifications for the main notifications page ---
export async function GET(request) {
    let userId;
    try {
        const authorizationHeader = request.headers.get('Authorization');
        if (!authorizationHeader?.startsWith('Bearer ')) {
            throw new Error('Authorization header is missing or malformed.');
        }
        const idToken = authorizationHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
    } catch (authError) {
        console.error("Authentication error:", authError.message);
        return new NextResponse(JSON.stringify({ error: 'Authentication failed.' }), { status: 401 });
    }

    try {
        // CORRECT PATH: The same path we write to in the POST function.
        const notificationsCollectionRef = db.collection('userProfiles').doc(userId).collection('inapp');
        
        // This query fetches the most recent notifications first.
        const q = notificationsCollectionRef.orderBy('timestamp', 'desc').limit(20); // Limit to 20 for the page
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return NextResponse.json({ notifications: [] });
        }
        
        const notifications = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Convert Firestore timestamp to a serializable format for the client
                timestamp: data.timestamp.toDate().toISOString(),
            };
        });

        return NextResponse.json({ notifications });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to fetch notifications.' }), { status: 500 });
    }
}