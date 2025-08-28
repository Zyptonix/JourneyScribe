// app/api/trips/[tripId]/plan/changes/route.js
import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebaseAdmin';
import { initClient } from '@/lib/firebaseClient';
import { getAmadeusToken } from '@/lib/amadeusToken';

export async function GET(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await db.collection('changes').where('tripId', '==', params.tripId).orderBy('ts', 'desc').limit(50).get();
  const changes = [];
  snap.forEach(d => changes.push({ id: d.id, ...d.data() }));
  return NextResponse.json(changes);
}
