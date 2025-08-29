import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// Create a new blog post
export async function POST(req) {
    try {
        const body = await req.json();
        const { title, content, shortDescription, location, authorId, thumbnail, tags } = body;

        if (!title || !content || !shortDescription || !location || !authorId || !thumbnail || !tags) {
            return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
        }

        const blogRef = await db.collection('blogs').add({
            title,
            content,
            shortDescription,
            location,
            authorId,
            thumbnail,
            tags,
            createdAt: new Date(),
            viewCount: 0,
        });

        return new Response(JSON.stringify({ blogId: blogRef.id }), { status: 201 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

// Get all blog posts
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const location = searchParams.get('location');

        let query = db.collection('blogs');
        if (location) query = query.where('location', '==', location);

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        // --- FIX: Fetch author details for each blog post ---
        const blogs = await Promise.all(snapshot.docs.map(async (doc) => {
            const blogData = doc.data();
            let authorName = 'Anonymous';

            if (blogData.authorId) {
                try {
                    // Assuming you have a 'userProfiles' collection where the key is the userId
                    const userProfileRef = db.collection('userProfiles').doc(blogData.authorId);
                    const userDoc = await userProfileRef.get();
                    if (userDoc.exists) {
                        authorName = userDoc.data().fullName || 'Anonymous';
                    }
                } catch (userError) {
                    console.error(`Failed to fetch user profile for authorId: ${blogData.authorId}`, userError);
                }
            }
            
            return { id: doc.id, ...blogData, authorName };
        }));

        return new Response(JSON.stringify(blogs), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}