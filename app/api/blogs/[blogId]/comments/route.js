import { db } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server'; // 1. Import NextResponse

export async function POST(req, { params }) {
  try {
    const { blogId } = await params;
    const { text, userId } = await req.json();

    if (!text || !userId) {
      return NextResponse.json({ error: 'Text and userId are required.' }, { status: 400 });
    }

    await db.collection('blogs').doc(blogId).collection('comments').add({
      text,
      userId,
      createdAt: new Date(),
    });

    // 2. Use NextResponse for the response
    return NextResponse.json({ message: 'Comment added' }, { status: 201 });

  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json({ error: 'Failed to add comment.' }, { status: 500 });
  }
}

export async function GET(_, { params }) {
  try {
    const { blogId } = await params;

    const snapshot = await db.collection('blogs')
      .doc(blogId).collection('comments')
      .orderBy('createdAt', 'asc').get();

    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Use NextResponse for the response
    return NextResponse.json(comments, { status: 200 });
    
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: 'Failed to fetch comments.' }, { status: 500 });
  }
}