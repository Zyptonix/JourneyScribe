// app/api/trips/[tripId]/budget/route.js
import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebaseAdmin';
import { getAmadeusToken } from '@/lib/amadeusToken';


const expensesCol = (tripId) => db.collection('trips').doc(tripId).collection('expenses');

export async function GET(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await expensesCol(params.tripId).get();
  const expenses = [];
  snap.forEach(d => expenses.push({ id: d.id, ...d.data() }));

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const perUser = {};
  for (const e of expenses) {
    if (e.splits && e.splits.length) {
      for (const s of e.splits) {
        perUser[s.userId] = (perUser[s.userId] || 0) + s.amount;
      }
    } else {
      perUser[e.paidBy] = (perUser[e.paidBy] || 0) + e.amount;
    }
  }

  return NextResponse.json({ expenses, total, perUser });
}

export async function POST(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.description || typeof body.amount !== 'number') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const doc = {
    description: body.description,
    amount: Number(body.amount),
    paidBy: body.paidBy || user.id,
    splits: body.splits || [],
    createdAt: Date.now(),
  };

  const ref = await expensesCol(params.tripId).add(doc);
  await db.collection('changes').add({ tripId: params.tripId, actorId: user.id, action: 'expense_add', payload: doc, ts: Date.now() });
  return NextResponse.json({ id: ref.id, ...doc }, { status: 201 });
}
