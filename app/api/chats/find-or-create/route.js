import { db } from '@/lib/firebaseAdmin';

export async function POST(req) {
    try {
        const { userId1, userId2 } = await req.json();
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        if (!userId1 || !userId2) {
            return new Response(JSON.stringify({ error: 'Both user IDs are required.' }), { status: 400 });
        }

        const chatsRef = db.collection(`chats`);
        
        // Firebase queries for arrays are tricky. A more reliable way is to query for one user 
        // and then filter for the second user on the backend.
        const q = chatsRef.where('participants', 'array-contains', userId1);
        
        const querySnapshot = await q.get();
        
        const existingChat = querySnapshot.docs.find(doc => 
            doc.data().participants.includes(userId2)
        );

        if (existingChat) {
            // If a chat is found, return its ID
            return new Response(JSON.stringify({ chatId: existingChat.id }), { status: 200 });
        } else {
            // If no chat exists, create a new one
            const newChatRef = await chatsRef.add({
                participants: [userId1, userId2],
                createdAt: new Date(),
            });
            return new Response(JSON.stringify({ chatId: newChatRef.id }), { status: 201 });
        }

    } catch (error) {
        console.error("Find or Create Chat API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
