// File: app/api/trips/[tripId]/remove-member/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request, { params }) {
    try {
        const { tripId } = params;
        const { memberIdToRemove } = await request.json();

        // 1. Authenticate the user trying to perform the action
        const authHeader = request.headers.get('authorization');
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const actionTakerId = decodedToken.uid;
        
        const appId = 'default-app-id';
        const tripRef = db.collection(`artifacts/${appId}/public/data/trips`).doc(tripId);
        const tripDoc = await tripRef.get();
        
        if (!tripDoc.exists) {
             return new NextResponse(JSON.stringify({ error: 'Trip not found.' }), { status: 404 });
        }
        
        const tripOwnerId = tripDoc.data().userId;

        // 2. Authorize: Only the trip owner OR the member themselves can perform this action
        if (actionTakerId !== tripOwnerId && actionTakerId !== memberIdToRemove) {
             return new NextResponse(JSON.stringify({ error: 'Forbidden. You are not authorized to remove this member.' }), { status: 403 });
        }

        // 3. Update the document by removing the member from the 'accepted' array
        await tripRef.update({
            accepted: FieldValue.arrayRemove(memberIdToRemove)
        });

        return NextResponse.json({ success: true, message: 'Member removed successfully.' });

    } catch (error) {
        console.error("Error removing trip member:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to remove member.' }), { status: 500 });
    }
}