// app/api/admin/route.js

import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin'; // Use the new, correct path to your admin SDK

// A simple authentication middleware to protect the API routes.
// In a real app, you would verify the user's ID token and check for a custom 'admin' claim.
const authenticateAdmin = async (req) => {
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  console.log('Token:', token);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    // You should set a custom claim like `admin: true` in your Firebase Authentication
    // to properly secure this. For this example, we'll assume the token is valid.
    if (!decodedToken.admin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return decodedToken;
  } catch (error) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
};

// =========================================================================
// API Handlers for Admin Functionality
// =========================================================================

// GET /api/admin - This route will be used for analytics and fetching data
export async function GET(req) {
  const adminAuth = await authenticateAdmin(req);
  if (adminAuth instanceof NextResponse) {
    return adminAuth; // Return the unauthorized response if authentication fails
  }

  try {
    // Fetch all users to get a count
    const usersSnapshot = await db.collection('userProfiles').get();
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch all content items
    const contentSnapshot = await db.collection('content').get();
    const allContent = contentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch top 10 popular content for the dashboard chart
    const popularContentQuery = db.collection('content').orderBy('popularity', 'desc').limit(10);
    const popularContentSnapshot = await popularContentQuery.get();
    const analyticsData = popularContentSnapshot.docs.map(doc => ({
      name: doc.data().title,
      views: doc.data().popularity
    }));

    return NextResponse.json({ 
      users: allUsers,
      content: allContent,
      analyticsData: analyticsData
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin - This route will be used for adding new content
export async function POST(req) {
  const adminAuth = await authenticateAdmin(req);
  if (adminAuth instanceof NextResponse) {
    return adminAuth;
  }

  try {
    const data = await req.json();
    const newContentRef = await db.collection('content').add(data);
    return NextResponse.json({ id: newContentRef.id, ...data }, { status: 201 });
  } catch (error) {
    console.error('Error adding new content:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/admin?id=... - This route is for updating content or promoting a destination
export async function PUT(req) {
  const adminAuth = await authenticateAdmin(req);
  if (adminAuth instanceof NextResponse) {
    return adminAuth;
  }

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return NextResponse.json({ message: 'Missing document ID' }, { status: 400 });
  }

  try {
    const data = await req.json();
    await db.collection('content').doc(docId).update(data);
    return NextResponse.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin?id=... - This route is for deleting content or users
export async function DELETE(req) {
  const adminAuth = await authenticateAdmin(req);
  if (adminAuth instanceof NextResponse) {
    return adminAuth;
  }

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('id');
  const type = searchParams.get('type'); // e.g., 'content' or 'users'

  if (!docId || !type) {
    return NextResponse.json({ message: 'Missing document ID or type' }, { status: 400 });
  }

  try {
    if (type === 'users') {
      await auth.deleteUser(docId);
    } else if (type === 'content') {
      await db.collection('content').doc(docId).delete();
    } else {
      return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }
    return NextResponse.json({ message: `${type} deleted successfully` });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
