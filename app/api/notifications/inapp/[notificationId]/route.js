// File: app/api/notifications/inapp/[notificationId]/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

// Helper to authenticate and get user ID
async function authenticate(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith("Bearer ")) {
        throw new Error('Unauthorized');
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
}

// DELETE a single notification
export async function DELETE(request, { params }) {
    try {
        const uid = await authenticate(request);
        const { notificationId } = params;
        
        const notifRef = db.collection('userProfiles').doc(uid).collection('inapp').doc(notificationId);
        await notifRef.delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        return new NextResponse(JSON.stringify({ error: error.message }), { status: error.message === 'Unauthorized' ? 401 : 500 });
    }
}