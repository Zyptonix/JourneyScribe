// app/api/admin/set-claim/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin'; // Ensure this path is correct

// This middleware is reused from your existing /api/admin/route.js
const authenticateAdmin = async (req) => {
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    console.error('Authentication Error: Token missing');
    return NextResponse.json({ message: 'Unauthorized: No token provided' }, { status: 401 });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    // Ensure the calling user has the admin claim
    if (!decodedToken.admin) {
      console.error('Authentication Error: Forbidden - User not admin', decodedToken.uid);
      return NextResponse.json({ message: 'Forbidden: You must be an admin to perform this action' }, { status: 403 });
    }
    return decodedToken;
  } catch (error) {
    console.error('Authentication Error: Invalid token', error.message);
    return NextResponse.json({ message: `Unauthorized: Invalid token - ${error.message}` }, { status: 401 });
  }
};

export async function POST(req) {
  // First, authenticate that the caller is an admin
  const adminAuth = await authenticateAdmin(req);
  if (adminAuth instanceof NextResponse) {
    return adminAuth; // Return the unauthorized/forbidden response if authentication fails
  }

  try {
    const { uid } = await req.json(); // Expecting { uid: "user-id-to-set-admin" }
    
    if (!uid) {
      return NextResponse.json({ message: 'Missing user UID in request body' }, { status: 400 });
    }

    // Set the custom 'admin' claim for the specified user
    await auth.setCustomUserClaims(uid, { admin: true });

    // Optionally, revoke all refresh tokens for the user to force them to re-authenticate
    // This ensures their ID token is refreshed with the new claim immediately.
    await auth.revokeRefreshTokens(uid);
    console.log(`Successfully set admin claim for UID: ${uid} and revoked refresh tokens.`);

    return NextResponse.json({ message: `Admin claim set and refresh tokens revoked for user: ${uid}` });

  } catch (error) {
    console.error('Error setting admin claim:', error);
    // Handle specific Firebase errors if needed, e.g., user not found
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Internal Server Error while setting admin claim' }, { status: 500 });
  }
}