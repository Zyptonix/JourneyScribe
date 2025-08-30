import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

// --- Helper function to get user notification preferences ---
async function getUserNotificationPreferences(userId) {
    if (!userId) return {};
    try {
        const userProfileRef = db.collection('userProfiles').doc(userId);
        const doc = await userProfileRef.get();
        if (!doc.exists) return {};
        return doc.data().notificationPreferences || {};
    } catch (error) {
        console.error(`Error fetching notification preferences for user ${userId}:`, error);
        return {};
    }
}

// --- POST: Adds a new comment and notifies the blog author ---
export async function POST(req, { params }) {
    try {
        const { blogId } = params;
        // The userId in the body is the person writing the comment.
        const { text, userId: commenterId } = await req.json();

        if (!text || !commenterId) {
            return NextResponse.json({ error: 'Text and userId are required.' }, { status: 400 });
        }

        // --- Notification Logic Step 1: Get the Blog Author ---
        const blogRef = db.collection('blogs').doc(blogId);
        const blogDoc = await blogRef.get();
        if (!blogDoc.exists) {
            return NextResponse.json({ error: 'Blog not found.' }, { status: 404 });
        }
        const blogData = blogDoc.data();
        const blogAuthorId = blogData.authorId;
        const blogTitle = blogData.title || 'your blog'; // Fallback title

        // --- Save the comment to Firestore ---
        await db.collection('blogs').doc(blogId).collection('comments').add({
            text,
            userId: commenterId,
            createdAt: FieldValue.serverTimestamp(), // Use server timestamp
        });

        // --- Notification Logic Step 2: Check and Send Notification ---
        // Prevents users from getting notifications for their own comments.
        if (commenterId !== blogAuthorId) {
            console.log(`✅ User ${commenterId} commented on a post by ${blogAuthorId}. Checking preferences...`);
            const authorPreferences = await getUserNotificationPreferences(blogAuthorId);
            
            // Using "default-on" logic
            if (authorPreferences.new_blog_comment !== false) {
                console.log(`📬 Comment notification preference is ON for author. Sending notification...`);
                const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                try {
                    // We don't need to 'await' this, it can run in the background.
                    fetch(`${apiUrl}/api/notifications/inapp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: blogAuthorId, // Send notification to the blog's author
                            title: 'New Comment on Your Blog',
                            message: `Someone commented on your post: "${blogTitle}"`,
                            link: `/blog/${blogId}`, // Link directly to the blog post
                        }),
                    });
                } catch (notifError) {
                    console.error("🔴 Failed to send in-app notification for new comment:", notifError);
                }
            } else {
                 console.log(`❌ Comment notification preference is OFF for author. Skipping.`);
            }
        } else {
             console.log(`👤 Author commented on their own post. No notification needed.`);
        }

        return NextResponse.json({ message: 'Comment added successfully.' }, { status: 201 });

    } catch (error) {
        console.error("Error adding comment:", error);
        return NextResponse.json({ error: 'Failed to add comment.' }, { status: 500 });
    }
}


// --- GET: Fetches all comments for a blog (Unchanged) ---
export async function GET(_, { params }) {
    try {
        const { blogId } = await params;
        const snapshot = await db.collection('blogs')
            .doc(blogId).collection('comments')
            .orderBy('createdAt', 'asc').get();

        const comments = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt.toDate().toISOString(), // Serialize timestamp
            };
        });

        return NextResponse.json(comments, { status: 200 });

    } catch (error) {
        console.error("Error fetching comments:", error);
        return NextResponse.json({ error: 'Failed to fetch comments.' }, { status: 500 });
    }
}