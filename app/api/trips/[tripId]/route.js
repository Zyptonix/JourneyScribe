// app/api/trips/[tripId]/route.js
import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebaseAdmin';
import { getAmadeusToken } from '@/lib/amadeusToken';


const tripsCol = db.collection('trips');

export async function GET(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const doc = await tripsCol.doc(params.tripId).get();
  if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const trip = { id: doc.id, ...doc.data() };
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
  if (trip.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden: only owner' }, { status: 403 });

  const updates = {};
  if (body.title) updates.title = body.title;
  if (body.goals) updates.goals = body.goals;
  if (body.futurePlans) updates.futurePlans = body.futurePlans;
  updates.updatedAt = Date.now();

  await ref.update(updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ref = tripsCol.doc(params.tripId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const trip = snapshot.data();
  if (trip.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await ref.delete();
  // NOTE: subcollections (planItems, expenses, etc.) are not deleted automatically.
  // For production, use a Cloud Function or batched deletes to remove subcollections.
  return NextResponse.json({ success: true });
}
