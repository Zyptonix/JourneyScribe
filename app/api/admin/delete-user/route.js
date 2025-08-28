// In /app/api/admin/delete-user/route.js

import { NextResponse } from 'next/server';
import { db, auth, verifyAdmin } from '@/lib/firebaseAdmin';

export async function POST(req) {
  try {
    // The verifyAdmin function (which we'll update in Step 2)
    // will check if the user is an admin.
    await verifyAdmin(req);

    // In the App Router, you get the body with `await req.json()`
    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ message: 'User UID is required.' }, { status: 400 });
    }

    // Delete user from Firebase Auth
    await auth.deleteUser(uid);

    // Delete user's profile from Firestore
    await db.collection('userProfiles').doc(uid).delete();

    // Use NextResponse to send the response
    return NextResponse.json({ message: `Successfully deleted user ${uid}.` }, { status: 200 });

  } catch (error) {
    console.error('Error in delete-user API:', error);
    if (error.code === 'permission-denied') {
      return NextResponse.json({ message: 'Permission denied. You must be an admin.' }, { status: 403 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}