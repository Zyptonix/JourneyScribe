import { NextResponse } from 'next/server';
// Make sure your admin import path and initialization are correct
import { db } from '@/lib/firebaseAdmin'; 
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';

// Helper to verify the user token from the request
async function getUserFromRequest(req) {
    const idToken = headers().get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return null;
    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        // Match the structure used on the frontend { id: uid }
        return { id: decodedToken.uid, ...decodedToken };
    } catch (error) {
        console.error("Token verification failed:", error);
        return null;
    }
}

const tripsCol = db.collection('trips');

export async function GET(req, { params }) {
    // This function remains unchanged
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = await tripsCol.doc(params.tripId).get();
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const trip = { id: doc.id, ...doc.data() };
    // Assuming memberIds is the correct field name for members
    if (!trip.memberIds || !trip.memberIds.includes(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json(trip);
}

export async function PUT(req, { params }) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ref = tripsCol.doc(params.tripId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const trip = snapshot.data();
    // CORRECTED: Aligning with the frontend's data field 'userId' for the owner
    if (trip.userId !== user.id) return NextResponse.json({ error: 'Forbidden: You must be the trip owner to edit.' }, { status: 403 });

    const updates = {};
    
    // --- Existing fields from your API ---
    if (body.title) updates.title = body.title;
    if (body.goals) updates.goals = body.goals;
    if (body.futurePlans) updates.futurePlans = body.futurePlans;
    
    // --- ADDED: New fields from the TripDetailsPage form ---
    if (body.location) updates.location = body.location;
    if (body.duration) updates.duration = body.duration;
    if (body.description) updates.description = body.description;
    if (body.cost) updates.cost = parseFloat(body.cost); // Ensure cost is a number
    if (body.currency) updates.currency = body.currency;
    if (body.startDate) updates.startDate = body.startDate;
    if (body.endDate) updates.endDate = body.endDate;

    // Use a consistent date format
    updates.updatedAt = new Date().toISOString();

    await ref.update(updates);
    return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
    // This function remains unchanged
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ref = tripsCol.doc(params.tripId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const trip = snapshot.data();
    // CORRECTED: Aligning with the frontend's data field 'userId' for the owner
    if (trip.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await ref.delete();
    return NextResponse.json({ success: true });
}