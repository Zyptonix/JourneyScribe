// File: app/api/notifications/inapp/mark-read/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // 1. Authenticate the user making the request
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith("Bearer ")) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // 2. Get the array of notification IDs from the request body
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return new NextResponse(JSON.stringify({ error: 'Notification IDs must be a non-empty array.' }), { status: 400 });
        }

        // 3. Use a WriteBatch for efficiency
        // This combines all updates into a single operation on the database.
        const batch = db.batch();
        const notificationsRef = db.collection('userProfiles').doc(uid).collection('inapp');

        ids.forEach(id => {
            const docRef = notificationsRef.doc(id);
            batch.update(docRef, { read: true });
        });

        // 4. Commit the batch to the database
        await batch.commit();

        return NextResponse.json({ success: true, message: `${ids.length} notifications marked as read.` });

    } catch (error) {
        console.error("Error marking notifications as read:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to mark notifications as read.' }), { status: 500 });
    }
}