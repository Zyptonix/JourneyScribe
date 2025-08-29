// app/api/trips/[tripId]/collaborators/route.js
import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebaseAdmin';
import { getAmadeusToken } from '@/lib/amadeusToken';
import { db } from '@/lib/firebaseAdmin';

const tripsCol = db.collection('trips');

export async function POST(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { collaboratorId, role } = body;
  if (!collaboratorId) return NextResponse.json({ error: 'Missing collaboratorId' }, { status: 400 });

  const ref = tripsCol.doc(params.tripId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const trip = snapshot.data();
  if (trip.ownerId !== user.id) return NextResponse.json({ error: 'Only owner' }, { status: 403 });

  const exists = (trip.memberIds || []).includes(collaboratorId);
  if (exists) return NextResponse.json({ error: 'Already collaborator' }, { status: 400 });

  const entry = { userId: collaboratorId, role: role || 'editor', joinedAt: Date.now() };
  await ref.update({
    collaborators: [...(trip.collaborators || []), entry],
    memberIds: [...(trip.memberIds || []), collaboratorId],
    updatedAt: Date.now(),
  });

  await db.collection('changes').add({ tripId: params.tripId, actorId: user.id, action: 'add_collaborator', payload: entry, ts: Date.now() });
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const collaboratorId = url.searchParams.get('collaboratorId');
  if (!collaboratorId) return NextResponse.json({ error: 'Missing collaboratorId' }, { status: 400 });

  const ref = tripsCol.doc(params.tripId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const trip = snapshot.data();
  if (trip.ownerId !== user.id) return NextResponse.json({ error: 'Only owner' }, { status: 403 });

  const newCollaborators = (trip.collaborators || []).filter(c => c.userId !== collaboratorId);
  const newMemberIds = (trip.memberIds || []).filter(id => id !== collaboratorId);

  await ref.update({ collaborators: newCollaborators, memberIds: newMemberIds, updatedAt: Date.now() });
  await db.collection('changes').add({ tripId: params.tripId, actorId: user.id, action: 'remove_collaborator', payload: { userId: collaboratorId }, ts: Date.now() });

  return NextResponse.json({ success: true });
}
