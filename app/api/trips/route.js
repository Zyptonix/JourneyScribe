import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; // Adjust the path as needed

// POST method to create a new trip.
// The user's ID must be passed in the request body.
export async function POST(request) {
  try {
    const { tripName, startDate, endDate, userId } = await request.json();

    if (!tripName || !startDate || !endDate || !userId) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newTrip = {
      name: tripName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leaderId: userId,
      users: [userId],
      activities: [],
      budget: { total: 0, expenses: [] },
      createdAt: new Date(),
    };

    const tripRef = await db.collection('trips').add(newTrip);
    return NextResponse.json({ id: tripRef.id, ...newTrip }, { status: 201 });
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// GET method to retrieve a list of ALL trips from the database.
export async function GET(request) {
    try {
        const trips = [];
        const snapshot = await db.collection('trips').get();

        snapshot.forEach(doc => {
            trips.push({ id: doc.id, ...doc.data() });
        });

        return NextResponse.json({ trips }, { status: 200 });
    } catch (error) {
        console.error('Error fetching trips:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}