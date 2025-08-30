// File: app/api/itinerary/[tripId]/[itemId]/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
    try {
        const { tripId, itemId } = params;
        const appId = 'default-app-id';

        const authHeader = request.headers.get('authorization');
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const tripRef = db.collection(`artifacts/${appId}/public/data/trips`).doc(tripId);
        const tripDoc = await tripRef.get();

        if (!tripDoc.exists) {
            return new NextResponse(JSON.stringify({ error: 'Trip not found.' }), { status: 404 });
        }

        const acceptedMembers = tripDoc.data().accepted || [];
        if (!acceptedMembers.includes(userId)) {
            return new NextResponse(JSON.stringify({ error: 'Forbidden. You are not a member of this trip.' }), { status: 403 });
        }

        const itemRef = tripRef.collection('itineraryItems').doc(itemId);
        await itemRef.delete();

        return NextResponse.json({ success: true, message: 'Item deleted.' });

    } catch (error) {
        console.error("Error deleting itinerary item:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to delete item.' }), { status: 500 });
    }
}