// File: app/api/trips/[tripId]/manage-request/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request, { params }) {
    try {
        // FIX #1: Access tripId directly from the params object.
        const { tripId } = params;
        const { requestUserId, action } = await request.json(); // action: 'accept' or 'decline'

        const authHeader = request.headers.get('authorization');
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const ownerId = decodedToken.uid;
        
        const appId = 'default-app-id';
        const tripRef = db.collection(`artifacts/${appId}/public/data/trips`).doc(tripId);
        const tripDoc = await tripRef.get();
        
        // FIX #2: Use the .exists property (boolean) instead of .exists() function.
        if (!tripDoc.exists || tripDoc.data().userId !== ownerId) {
             return new NextResponse(JSON.stringify({ error: 'Forbidden. You are not the owner of this trip.' }), { status: 403 });
        }

        if (action === 'accept') {
            await tripRef.update({
                requests: FieldValue.arrayRemove(requestUserId),
                accepted: FieldValue.arrayUnion(requestUserId)
            });
        } else if (action === 'decline') {
            await tripRef.update({
                requests: FieldValue.arrayRemove(requestUserId)
            });
        } else {
             return new NextResponse(JSON.stringify({ error: 'Invalid action.' }), { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error managing trip request:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to manage request.' }), { status: 500 });
    }
}