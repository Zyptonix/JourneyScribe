// app/api/trips/history/route.js
import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebaseAdmin';
import { getAmadeusToken } from '@/lib/amadeusToken';


export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snapshot = await db.collection('trips').where('memberIds', 'array-contains', user.id).get();
  const history = [];

  for (const doc of snapshot.docs) {
    const t = { id: doc.id, ...doc.data() };
    const expensesSnap = await db.collection('trips').doc(doc.id).collection('expenses').get();
    const changesSnap = await db.collection('changes').where('tripId', '==', doc.id).orderBy('ts', 'desc').limit(10).get();
    history.push({
      trip: t,
      expenseCount: expensesSnap.size,
      recentChanges: changesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    });
  }

  return NextResponse.json(history);
}
