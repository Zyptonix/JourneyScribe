// app/api/user-profiles/[uid]/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; // Import Firebase Admin db instance

/**
 * Handles GET requests to retrieve a user profile by UID.
 * @param {Request} request The incoming request object.
 * @param {Object} context The context object containing route parameters.
 * @param {Object} context.params The route parameters, e.g., { uid: 'user_id_here' }.
 * @returns {NextResponse} The JSON response containing the user profile data or an error.
 */
export async function GET(request, { params }) {
  const { uid } = params; // Get the user ID from the URL parameter

  if (!uid) {
    // Return a 400 Bad Request if UID is missing
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    // Reference to the user's document in the 'userProfiles' collection
    const userProfileRef = db.collection('userProfiles').doc(uid);
    const docSnap = await userProfileRef.get(); // Fetch the document

    if (!docSnap.exists) {
      // Return a 404 Not Found if the document does not exist
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    // Return the document data with a 200 OK status
    return NextResponse.json(docSnap.data(), { status: 200 });
  } catch (error) {
    // Log the error and return a 500 Internal Server Error
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

/**
 * Handles PUT requests to update a user profile by UID.
 * Uses `merge: true` to update only specified fields without overwriting the entire document.
 * @param {Request} request The incoming request object containing the update data in its body.
 * @param {Object} context The context object containing route parameters.
 * @param {Object} context.params The route parameters, e.g., { uid: 'user_id_here' }.
 * @returns {NextResponse} A JSON response indicating success or an error.
 */
export async function PUT(request, { params }) {
  const { uid } = params; // Get the user ID from the URL parameter

  if (!uid) {
    // Return a 400 Bad Request if UID is missing
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  const data = await request.json(); // Parse the request body as JSON
  const { email, fullName, profilePicture, location } = data; // Destructure expected fields

  // Check if at least one field is provided for update
  if (!email && !fullName && !profilePicture && !location) {
      return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
  }

  try {
    // Reference to the user's document in the 'userProfiles' collection
    const userProfileRef = db.collection('userProfiles').doc(uid);

    // Prepare update data: only include fields that are explicitly provided and not undefined
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (location !== undefined) updateData.location = location;

    // Update the document with the provided data, merging with existing fields
    await userProfileRef.set(updateData, { merge: true });

    // Return a success message with a 200 OK status
    return NextResponse.json({ message: 'User profile updated successfully' }, { status: 200 });
  } catch (error) {
    // Log the error and return a 500 Internal Server Error
    console.error('Error updating user profile:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
