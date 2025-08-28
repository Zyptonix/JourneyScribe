import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req, { params }) {
  try {
    const { blogId } = params;
    if (!blogId) {
      return new Response(JSON.stringify({ error: 'Blog ID is required' }), { status: 400 });
    }

    const blogRef = db.collection('blogs').doc(blogId);
    const doc = await blogRef.get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ error: 'Blog post not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ id: doc.id, ...doc.data() }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// --- NEW: Function to increment view count ---
export async function POST(req, { params }) {
    try {
        const { blogId } = params;
        if (!blogId) {
            return new Response(JSON.stringify({ error: 'Blog ID is required' }), { status: 400 });
        }

        const blogRef = db.collection('blogs').doc(blogId);
        
        // Atomically increment the viewCount field
        await blogRef.update({
            viewCount: FieldValue.increment(1)
        });

        return new Response(JSON.stringify({ success: true, message: 'View count updated.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error updating view count:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
