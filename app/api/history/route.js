// app/api/history/route.js
import { NextResponse } from "next/server";
import { db, auth } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

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

function computeBadges({ countriesVisited, blogsPosted }) {
  const countryBadge =
    countriesVisited >= 20 ? "Globetrotter 🏆" :
    countriesVisited >= 10 ? "Explorer 🥈" :
    countriesVisited >= 5  ? "Traveler 🥉" :
    countriesVisited >= 1  ? "First Trip ✨" : "Newbie";

  const blogBadge =
    blogsPosted >= 50 ? "Master Blogger 🏆" :
    blogsPosted >= 20 ? "Storyteller 🥈" :
    blogsPosted >= 5  ? "Budding Writer 🥉" :
    blogsPosted >= 1  ? "First Blog ✨" : "Silent Wanderer";

  return { countryBadge, blogBadge };
}

function tsToIso(ts) {
  if (!ts) return null;
  if (typeof ts === "string") return ts;
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  try {
    return new Date(ts).toISOString();
  } catch {
    return null;
  }
}

// ------------- GET -------------
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "leaderboard" | "badges" | null
  const userId = await getUserIdFromReq(req);

  try {
    // 1) Leaderboard (public)
    if (type === "leaderboard") {
      const tripsSnap = await db.collection("trips").where("status", "==", "completed").get();
      const countrySetByUser = new Map();
      tripsSnap.forEach(doc => {
        const t = doc.data();
        (t.users || []).forEach(uid => {
          if (!countrySetByUser.has(uid)) countrySetByUser.set(uid, new Set());
          if (t.destinationCountry) countrySetByUser.get(uid).add(t.destinationCountry);
        });
      });

      const blogsSnap = await db.collection("blogs").get();
      const blogCountByUser = new Map();
      blogsSnap.forEach(doc => {
        const b = doc.data();
        if (!b.authorId) return;
        blogCountByUser.set(b.authorId, (blogCountByUser.get(b.authorId) || 0) + 1);
      });

      const userIds = new Set([...countrySetByUser.keys(), ...blogCountByUser.keys()]);
      const users = await Promise.all(
        [...userIds].map(async uid => {
          const uDoc = await db.collection("users").doc(uid).get();
          const displayName = uDoc.exists ? (uDoc.data().displayName || uid) : uid;
          const countriesVisited = (countrySetByUser.get(uid) || new Set()).size;
          const blogsPosted = blogCountByUser.get(uid) || 0;
          const badges = computeBadges({ countriesVisited, blogsPosted });
          return { uid, displayName, countriesVisited, blogsPosted, badges };
        })
      );

      users.sort((a, b) => b.countriesVisited - a.countriesVisited || b.blogsPosted - a.blogsPosted);
      return NextResponse.json({ leaderboard: users.slice(0, 50) });
    }

    // 2) Badges for user (requires userId)
    if (type === "badges") {
      if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

      const tripsSnap = await db.collection("trips")
        .where("users", "array-contains", userId)
        .where("status", "==", "completed").get();
      const countries = new Set();
      tripsSnap.forEach(d => {
        const c = d.data().destinationCountry;
        if (c) countries.add(c);
      });

      const blogsSnap = await db.collection("blogs").where("authorId", "==", userId).get();
      const badgeInfo = computeBadges({ countriesVisited: countries.size, blogsPosted: blogsSnap.size });

      return NextResponse.json({
        userId,
        countriesVisited: countries.size,
        blogsPosted: blogsSnap.size,
        badges: badgeInfo
      });
    }

    // 3) Trip history for a user (requires userId)
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const snap = await db.collection("trips").where("users", "array-contains", userId).get();
    const trips = snap.docs.map(d => {
      const t = d.data();
      return {
        id: d.id,
        ...t,
        startDate: tsToIso(t.startDate),
        endDate: tsToIso(t.endDate),
      };
    });

    const completed = trips.filter(t => t.status === "completed");
    const ongoing = trips.filter(t => t.status === "ongoing");
    const planned = trips.filter(t => t.status === "planned");

    return NextResponse.json({ completed, ongoing, planned });
  } catch (e) {
    console.error("history GET:", e);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// ------------- POST (add goal) -------------
export async function POST(req) {
  try {
    const body = await req.json();
    const { tripId, title } = body || {};
    if (!tripId || !title) return NextResponse.json({ message: "Missing fields" }, { status: 400 });

    const ref = db.collection("trips").doc(tripId);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ message: "Trip not found" }, { status: 404 });

    const goal = { id: crypto.randomUUID(), title, done: false, createdAt: new Date() };
    await ref.update({ goals: admin.firestore.FieldValue.arrayUnion(goal) });

    return NextResponse.json({ success: true, goal }, { status: 201 });
  } catch (e) {
    console.error("history POST goal:", e);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// ------------- PATCH (toggle / update goal) -------------
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { tripId, goalId, done } = body || {};
    if (!tripId || !goalId || typeof done !== "boolean") {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const ref = db.collection("trips").doc(tripId);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ message: "Trip not found" }, { status: 404 });

    const trip = doc.data();
    const goals = Array.isArray(trip.goals) ? trip.goals : [];
    const updatedGoals = goals.map(g => (g.id === goalId ? { ...g, done, updatedAt: new Date() } : g));
    await ref.update({ goals: updatedGoals });

    return NextResponse.json({ success: true, goals: updatedGoals });
  } catch (e) {
    console.error("history PATCH goal:", e);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// ------------- DELETE (remove goal) -------------
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    // allow body or query params, support either
    let body;
    try { body = await req.json(); } catch { body = null; }
    const tripId = body?.tripId || searchParams.get("tripId");
    const goalId = body?.goalId || searchParams.get("goalId");

    if (!tripId || !goalId) return NextResponse.json({ message: "Missing tripId or goalId" }, { status: 400 });

    const ref = db.collection("trips").doc(tripId);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ message: "Trip not found" }, { status: 404 });

    const trip = doc.data();
    const goals = Array.isArray(trip.goals) ? trip.goals : [];
    const filtered = goals.filter(g => g.id !== goalId);
    await ref.update({ goals: filtered });

    return NextResponse.json({ success: true, goals: filtered });
  } catch (e) {
    console.error("history DELETE goal:", e);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
