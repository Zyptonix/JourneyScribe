// app/api/leaderboard/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firestore';

export async function GET(req) {
  // Simple leaderboard: number of trips created per owner
  const snapshot = await db.collection('trips').get();
  const counts = {};
  snapshot.forEach(doc => {
    const t = doc.data();
    counts[t.ownerId] = (counts[t.ownerId] || 0) + 1;
  });

  const arr = Object.entries(counts).map(([userId, tripsCreated]) => ({ userId, tripsCreated }));
  arr.sort((a, b) => b.tripsCreated - a.tripsCreated);
  return NextResponse.json(arr.slice(0, 50));
}
