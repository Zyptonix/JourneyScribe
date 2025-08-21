// app/api/chats/route.js
import { db } from '@/lib/firebaseAdmin'

export async function POST(req) {
  try {
    const { userId1, userId2, location } = await req.json()

    // Check if chat already exists
    const existing = await db.collection('chats')
      .where('participants', 'array-contains', userId1).get()

    const chat = existing.docs.find(doc => {
      const data = doc.data()
      return data.participants.includes(userId2) && data.location === location
    })

    if (chat) {
      return new Response(JSON.stringify({ chatId: chat.id }), { status: 200 })
    }

    const newChat = await db.collection('chats').add({
      participants: [userId1, userId2],
      location,
      createdAt: new Date(),
    })

    return new Response(JSON.stringify({ chatId: newChat.id }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
