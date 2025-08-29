// app/api/badges/route.js
import { NextResponse } from 'next/server';
import { db,auth } from '@/lib/firebaseAdmin';

// Helper: get userId from query param OR Authorization Bearer token
async function getUserIdFromReq(req) {
  const { searchParams } = new URL(req.url);
  const qUserId = searchParams.get("userId");
  if (qUserId) return qUserId;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

const badgesCol = db.collection('badges');
const userBadgesCol = db.collection('userBadges');

export async function GET(req) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  const badgesSnap = await badgesCol.get();
  const badges = badgesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!userId) return NextResponse.json(badges);

  const assignmentsSnap = await userBadgesCol.where('userId', '==', userId).get();
  const assignments = assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ badges, assignments });
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { userId, badgeId } = body;
  if (!userId || !badgeId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  await userBadgesCol.add({ userId, badgeId, awardedAt: Date.now(), awardedBy: user.id });
  return NextResponse.json({ success: true }, { status: 201 });
}
