// app/api/reviews/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseClient"; 
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

// POST → Add new review
export async function POST(req) {
  try {
    const { location, username, rating, comment } = await req.json();

    if (!location || !username || !rating || !comment) {
      return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
    }

    await addDoc(collection(db, "reviews"), {
      location,
      username,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Feedback added successfully!" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET → Fetch reviews by location
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");

    if (!location) {
      return NextResponse.json({ success: false, message: "Location required" }, { status: 400 });
    }

    const q = query(collection(db, "reviews"), where("location", "==", location));
    const snapshot = await getDocs(q);

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
