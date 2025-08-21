import { db } from '@/lib/firebaseAdmin'

export async function POST(req) {
  try {
    const body = await req.json()
    const { title, content, location, authorId } = body

    const blogRef = await db.collection('blogs').add({
      title,
      content,
      location,
      authorId,
      createdAt: new Date(),
    })

    return new Response(JSON.stringify({ blogId: blogRef.id }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

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
