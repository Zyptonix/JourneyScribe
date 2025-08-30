// File: app/api/notifications/inapp/bulk-update/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith("Bearer ")) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { action } = await request.json();
        const notificationsRef = db.collection('userProfiles').doc(uid).collection('inapp');
        
        const batch = db.batch();
        const snapshot = await notificationsRef.get();

        if (action === 'mark_all_read') {
            const unreadSnapshot = await notificationsRef.where('read', '==', false).get();
            unreadSnapshot.docs.forEach(doc => batch.update(doc.ref, { read: true }));
        } else if (action === 'delete_all') {
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        } else {
            return new NextResponse(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
        }

        await batch.commit();
        return NextResponse.json({ success: true });

    } catch (error) {
        return new NextResponse(JSON.stringify({ error: 'Failed to perform bulk action' }), { status: 500 });
    }
}