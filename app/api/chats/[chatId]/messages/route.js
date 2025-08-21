import { db } from '@/lib/firebaseAdmin'

export async function POST(req, { params }) {
  try {
    const { chatId } = params
    const { senderId, text } = await req.json()

    await db.collection('chats').doc(chatId).collection('messages').add({
      senderId,
      text,
      createdAt: new Date(),
    })

    return new Response(JSON.stringify({ message: 'Message sent' }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function GET(_, { params }) {
  try {
    const { chatId } = params

    const snapshot = await db.collection('chats')
      .doc(chatId).collection('messages')
      .orderBy('createdAt', 'asc').get()

    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return new Response(JSON.stringify(messages), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
