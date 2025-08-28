import { db } from '@/lib/firebaseAdmin'

// Create a new blog post
export async function POST(req) {
    try {
        const body = await req.json()
        // Added thumbnail and tags to the destructured body
        const { title, content, location, authorId, thumbnail, tags } = body

        if (!title || !content || !location || !authorId || !thumbnail || !tags) {
            return new Response(JSON.stringify({ error: 'All fields including thumbnail and tags are required.' }), { status: 400 });
        }

        const blogRef = await db.collection('blogs').add({
            title,
            content,
            location,
            authorId,
            thumbnail, // Save the thumbnail URL
            tags,      // Save the array of tags
            createdAt: new Date(),
            viewCount: 0, // Initialize view count for popularity sorting
        })

        return new Response(JSON.stringify({ blogId: blogRef.id }), { status: 201 })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
}

// Get all blog posts, optionally filtering by location
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url)
        const location = searchParams.get('location')

        let query = db.collection('blogs')
        if (location) query = query.where('location', '==', location)

        const snapshot = await query.orderBy('createdAt', 'desc').get()
        const blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        return new Response(JSON.stringify(blogs), { status: 200 })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
}
