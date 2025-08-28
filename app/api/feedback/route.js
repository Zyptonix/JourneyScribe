import { NextResponse } from 'next/server';
// 1. Import 'db' from your provided admin file
import { db } from '../../../lib/firebaseAdmin.js'; // Adjust path if needed

// 2. Import FieldValue for the server-side timestamp
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  
  // 3. Use the correct Admin SDK syntax with your 'db' instance
  const feedbackCol = db.collection('feedback');

  try {
    // === IF A SPECIFIC LOCATION IS REQUESTED ===
    if (location) {
      const q = feedbackCol.where('location', '==', location);
      const querySnapshot = await q.get();

      const reviews = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      return NextResponse.json({ success: true, reviews });
    }

    // === IF NO LOCATION IS SPECIFIED (for the main dashboard) ===
    const querySnapshot = await feedbackCol.get();
    const allFeedback = querySnapshot.docs.map(doc => doc.data());

    // Aggregate the data (this logic is unchanged)
    const locationStats = {};
    allFeedback.forEach(review => {
      const loc = review.location;
      if (!locationStats[loc]) {
        locationStats[loc] = { totalRating: 0, reviewCount: 0 };
      }
      locationStats[loc].totalRating += review.rating;
      locationStats[loc].reviewCount += 1;
    });

    const aggregatedData = Object.keys(locationStats).map(loc => ({
      location: loc,
      reviewCount: locationStats[loc].reviewCount,
      avgRating: (locationStats[loc].totalRating / locationStats[loc].reviewCount).toFixed(1),
    }));

    return NextResponse.json({ success: true, locations: aggregatedData });

  } catch (error) {
    console.error("Feedback API Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve feedback.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { location, username, rating, comment } = body;

    if (!location || !username || !rating || !comment) {
      return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    }

    // 4. Use Admin SDK's .add() and the imported FieldValue
    const docRef = await db.collection('feedback').add({
      ...body,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully!', feedbackId: docRef.id });
  } catch (error) {
    console.error("Feedback API Error:", error);
    return NextResponse.json({ success: false, message: 'Failed to submit feedback.' }, { status: 500 });
  }
}