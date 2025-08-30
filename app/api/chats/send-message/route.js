// File: app/api/chats/send-message/route.js

import { db, adminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

// Helper to get user preferences
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
        // 1. Authenticate the user and get their ID (the sender)
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith("Bearer ")) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const senderId = decodedToken.uid;

        const { text, chatId, chatType } = await request.json();
        if (!text || !chatId || !chatType) {
            return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        // 2. Determine the correct Firestore collection for the message
        let messagesRef;
        if (chatType === 'user') {
            messagesRef = db.collection('chats').doc(chatId).collection('messages');
        } else { // 'trip'
            // NOTE: The appId is not available on the server. You need to define it or hardcode it.
            const appId = 'default-app-id'; // Replace with your actual App ID if it's dynamic
            messagesRef = db.collection(`artifacts/${appId}/public/data/trips`).doc(chatId).collection('messages');
        }

        // 3. Save the new message to the database
        await messagesRef.add({
            text,
            senderId,
            createdAt: FieldValue.serverTimestamp(),
        });

        // 4. Handle sending notifications
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        let recipients = [];

        if (chatType === 'user') {
            // For a 1-on-1 chat, find the other person
            const chatDoc = await db.collection('chats').doc(chatId).get();
            recipients = chatDoc.data().participants.filter(id => id !== senderId);
        } else { // 'trip'
            // For a trip chat, find all other members
            const appId = 'default-app-id';
            const tripDoc = await db.collection(`artifacts/${appId}/public/data/trips`).doc(chatId).get();
            recipients = tripDoc.data().accepted.filter(id => id !== senderId);
        }
        
        console.log(`Message sent by ${senderId}. Notifying recipients:`, recipients);

        // Send a notification to each recipient
        for (const recipientId of recipients) {
            const preferences = await getUserNotificationPreferences(recipientId);
            if (preferences.new_chat_message !== false) {
                 // We don't need to wait for this to finish
                fetch(`${apiUrl}/api/notifications/inapp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: recipientId,
                        title: `New Message from ${decodedToken.name || 'a user'}`,
                        message: text,
                        link: '/chat', // Link to the main chat page
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