import { db } from '@/lib/firebaseAdmin'

export async function POST(req, { params }) {
  try {
    const { blogId } = params
    const { text, userId } = await req.json()

    await db.collection('blogs').doc(blogId).collection('comments').add({
      text,
      userId,
      createdAt: new Date(),
    })

    return new Response(JSON.stringify({ message: 'Comment added' }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function GET(_, { params }) {
  try {
    const { blogId } = params

    const snapshot = await db.collection('blogs')
      .doc(blogId).collection('comments')
      .orderBy('createdAt', 'asc').get()

    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return new Response(JSON.stringify(comments), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
