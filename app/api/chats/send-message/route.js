// File: app/api/chats/send-message/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

// Helper to get user preferences (no changes needed here)
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

export async function POST(request) {
    try {
        // 1. Authenticate the user
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith("Bearer ")) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const senderId = decodedToken.uid;

        // ✨ **FIX 1: More robust sender name retrieval**
        const senderProfileRef = db.collection('userProfiles').doc(senderId);
        const senderProfileDoc = await senderProfileRef.get();
        const senderName = senderProfileDoc.exists ? senderProfileDoc.data().fullName : (decodedToken.name || decodedToken.email);

        const { text, chatId, chatType } = await request.json();
        if (!text || !chatId || !chatType) {
            return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        // 2. Save the new message to the database
        let messagesRef;
        if (chatType === 'user') {
            messagesRef = db.collection('chats').doc(chatId).collection('messages');
        } else { // 'trip'
            messagesRef = db.collection('trips').doc(chatId).collection('messages');
        }
        await messagesRef.add({
            text,
            senderId,
            createdAt: FieldValue.serverTimestamp(),
        });

        // 3. ✨ **FIX 2: Determine recipients AND notification title based on chat type**
        let recipients = [];
        let notificationTitle = '';

        if (chatType === 'user') {
            const chatDoc = await db.collection('chats').doc(chatId).get();
            recipients = chatDoc.data().participants.filter(id => id !== senderId);
            notificationTitle = `New Message from ${senderName || 'a user'}`;
        } else { // 'trip'
            const tripDoc = await db.collection('trips').doc(chatId).get();
            recipients = tripDoc.data().accepted.filter(id => id !== senderId);

            // Assuming the trip document has a 'location' field. Change if needed.
            const tripName = tripDoc.exists ? tripDoc.data().location : 'your trip';
            notificationTitle = `New Message in ${tripName}`;
        }
        
        console.log(`Message sent by ${senderId}. Notifying recipients:`, recipients);

        // 4. Send a notification to each recipient
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        for (const recipientId of recipients) {
            const preferences = await getUserNotificationPreferences(recipientId);
            if (preferences.new_chat_message !== false) {
                fetch(`${apiUrl}/api/notifications/inapp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: recipientId,
                        // ✨ **FIX 3: Use the dynamically set notification title**
                        title: notificationTitle,
                        message: text,
                        link: '/chat',
                    }),
                }).catch(err => console.error(`Failed to send chat notification to ${recipientId}:`, err));
            }
        }
        
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error sending message:", error);
        return new NextResponse(JSON.stringify({ error: 'Failed to send message.' }), { status: 500 });
    }
}