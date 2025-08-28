// app/api/notifications/send/route.js

// Remove client-side Firestore imports
// import { initializeApp } from 'firebase/app';
// import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
// import { getFirestore, doc, getDoc, collection, addDoc } from 'firebase/firestore';

// Keep the Firebase Admin SDK import
import { db } from '@/lib/firebaseAdmin'; // Adjust path as needed

export async function POST(request) {
    const { userId, type, message, details } = await request.json();

    if (!userId || !type || !message) {
        return new Response(JSON.stringify({ error: 'Missing required fields: userId, type, message' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Use db.doc() and db.collection() directly from the Admin SDK instance
    const userPrefsDocRef = db.doc(`artifacts/${appId}/users/${userId}/preferences/${type}`);
    const inAppNotificationsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/notifications`);

    try {
        const prefsSnap = await userPrefsDocRef.get(); // .get() method is called on the doc reference directly
        const userPreferences = prefsSnap.exists ? prefsSnap.data() : null;

        const channels = userPreferences && userPreferences.enabled ? userPreferences.channels || [] : [];
        
        if (channels.length === 0) {
            console.log(`[NOTIF SENDER] User ${userId} not subscribed or notifications disabled for type ${type}. Skipping.`);
            return new Response(JSON.stringify({ success: true, message: 'Notification skipped: user not subscribed or disabled.' }), { status: 200 });
        }

        // --- Send Email Notification (Calling internal API) ---
        if (channels.includes('email')) {
            const userEmail = details?.userEmail || 'testuser@example.com'; // IMPORTANT: Replace with a real email for testing

            console.log(`[NOTIF SENDER] Preparing to send email to ${userEmail} for type ${type}: "${message}"`);
            
            try {
                const emailResponse = await fetch(`http://localhost:9243/api/send-email`, { // Ensure correct port
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: userEmail,
                        subject: `Notification: ${type.replace(/_/g, ' ').toUpperCase()}!`,
                        textContent: message,
                        htmlContent: `<p>${message}</p><p>Details: ${JSON.stringify(details, null, 2)}</p>`
                    })
                });

                if (!emailResponse.ok) {
                    const emailErrorData = await emailResponse.json();
                    console.error(`[NOTIF SENDER] Failed to send email via internal API:`, emailErrorData);
                } else {
                    console.log(`[NOTIF SENDER] Email dispatch initiated for ${userEmail}.`);
                }
            } catch (emailApiError) {
                console.error(`[NOTIF SENDER] Error calling internal /api/send-email API:`, emailApiError);
            }
        }

        // --- Save In-App Notification to Firestore ---
        if (channels.includes('in_app')) {
            console.log(`[NOTIF SENDER] Saving in-app notification for user ${userId} for type ${type}: "${message}"`);
            // Use .add() method directly on the collection reference from Admin SDK
            await inAppNotificationsCollectionRef.add({
                type,
                message,
                details: details || {},
                read: false,
                timestamp: new Date().toISOString()
            });

            console.log(`[NOTIF SENDER] Triggering real-time push for user ${userId} for in-app notification.`);
        }

        return new Response(JSON.stringify({ success: true, message: 'Notification processed.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        return new Response(JSON.stringify({ error: 'Failed to send notification.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}