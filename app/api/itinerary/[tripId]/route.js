// File: app/api/itinerary/[tripId]/route.js
import { db } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request, { params }) {
  const { tripId } = params;
  const newEvent = await request.json();

  const idToken = headers().get('Authorization')?.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // 1. Get the trip document to verify the user is a member
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const tripData = tripDoc.data();
    // 2. **Crucial Security Check**: Ensure the user is part of the trip
    if (!tripData.accepted || !tripData.accepted.includes(userId)) {
      return NextResponse.json({ error: 'User is not a member of this trip' }, { status: 403 });
    }

    // 3. User is authorized, so add the new item to the subcollection
    const itineraryItemsRef = tripRef.collection('itineraryItems');
    const docRef = await itineraryItemsRef.add({
      ...newEvent,
      addedBy: userId, // Track who added the item
      addedAt: new Date(),
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error adding itinerary item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}