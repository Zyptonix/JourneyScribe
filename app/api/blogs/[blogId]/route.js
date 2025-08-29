import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// --- GET a single blog post with author details ---
export async function GET(req, { params }) {
  try {
    const { blogId } = await params;
    if (!blogId) {
      return new Response(JSON.stringify({ error: 'Blog ID is required' }), { status: 400 });
    }

    const blogRef = db.collection('blogs').doc(blogId);
    const doc = await blogRef.get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ error: 'Blog post not found' }), { status: 404 });
    }

    const blogData = doc.data();
    let authorName = 'Anonymous';
    let authorEmail = 'Not available';

    // Fetch author details from userProfiles collection
    if (blogData.authorId) {
        try {
            const userProfileRef = db.collection('userProfiles').doc(blogData.authorId);
            const userDoc = await userProfileRef.get();
            if (userDoc.exists) {
                authorName = userDoc.data().fullName || 'Anonymous';
                authorEmail = userDoc.data().email || 'Not available';
            }
        } catch (userError) {
            console.error(`Failed to fetch user profile for authorId: ${blogData.authorId}`, userError);
        }
    }

    return new Response(JSON.stringify({ id: doc.id, ...blogData, authorName, authorEmail }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// --- POST to increment view count ---
export async function POST(req, { params }) {
    try {
        const { blogId } = await params;
        if (!blogId) {
            return new Response(JSON.stringify({ error: 'Blog ID is required' }), { status: 400 });
        }

        const blogRef = db.collection('blogs').doc(blogId);
        await blogRef.update({ viewCount: FieldValue.increment(1) });

        return new Response(JSON.stringify({ success: true, message: 'View count updated.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating view count:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
