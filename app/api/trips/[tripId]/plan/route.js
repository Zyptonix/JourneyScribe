// app/api/trips/[tripId]/plan/route.js
import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebaseAdmin';
import { getAmadeusToken } from '@/lib/amadeusToken';


const planCol = (tripId) => db.collection('trips').doc(tripId).collection('planItems');

export async function GET(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await planCol(params.tripId).get();
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return NextResponse.json(items);
}

export async function POST(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  const doc = {
    title: body.title,
    description: body.description || '',
    date: body.date || null,
    location: body.location || '',
    createdBy: user.id,
    createdAt: Date.now(),
  };

  const ref = await planCol(params.tripId).add(doc);
  await db.collection('changes').add({ tripId: params.tripId, actorId: user.id, action: 'plan_item_add', payload: doc, ts: Date.now() });
  return NextResponse.json({ id: ref.id, ...doc }, { status: 201 });
}
