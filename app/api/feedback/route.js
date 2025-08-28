// app/api/feedback/route.js (for Next.js App Router)

// Import Firebase instances from your centralized client setup
import { db, auth } from '@/lib/firebaseClient'; // Adjust path if your firebaseClient is elsewhere
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { signInWithCustomToken, signInAnonymously } from 'firebase/auth'; // Still needed for auth actions

// IMPORTANT: Authenticate on the server side if __initial_auth_token is provided
// This allows Firestore rules based on auth.uid to work.
async function ensureAuthenticated() {
    if (!auth.currentUser) {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                await signInWithCustomToken(auth, __initial_auth_token);
                console.log("[API Feedback] Signed in with custom token.");
            } catch (error) {
                console.error("[API Feedback] Error signing in with custom token:", error);
                // Fallback to anonymous if custom token fails
                await signInAnonymously(auth);
                console.warn("[API Feedback] Signed in anonymously due to custom token error.");
            }
        } else {
            // Sign in anonymously if no custom token provided (e.g., in local dev without full auth context)
            await signInAnonymously(auth);
            console.warn("[API Feedback] Signed in anonymously as no initial auth token was provided.");
        }
    }
}


// --- POST method for submitting new feedback ---
export async function POST(request) {
    // Ensure authentication is set up before any Firestore operation that relies on it
    await ensureAuthenticated(); 

    const { locationId, userId, username, rating, comment, tripId, locationName } = await request.json();

    // Basic validation
    if (!locationId || !userId || !username || !rating || !comment || !locationName) {
        return new Response(JSON.stringify({ error: 'Missing required feedback data (locationId, userId, username, rating, comment, locationName)' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Optional: Validate userId matches authenticated user if strict security is required.
    // For now, we trust the userId sent from the client, but in a real app,
    // you'd verify `auth.currentUser?.uid === userId`.
    // Since __initial_auth_token might be for a different user or anonymous,
    // this check might be complex without a proper backend authentication system.
    // For Canvas demos, we proceed assuming frontend handles user ID.

    try {
        // Access __app_id for the collection path as defined in your global setup
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        // --- FIX: Added 'data' segment to the collection path ---
        const feedbackCollectionRef = collection(db, `artifacts/${appId}/public/data/locationReviews`);
        
        const docRef = await addDoc(feedbackCollectionRef, {
            locationId: locationId,
            locationName: locationName,
            userId: userId,
            username: username,
            rating: Number(rating), // Ensure rating is a number
            comment: comment,
            tripId: tripId || null, // Optional
            createdAt: new Date(),
            lastUpdated: new Date(),
        });

        console.log(`[API FEEDBACK] New feedback added for ${locationName} (${locationId}) by ${username}. Doc ID: ${docRef.id}`);

        return new Response(JSON.stringify({ success: true, message: 'Feedback submitted successfully', feedbackId: docRef.id }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('API Route Error (Feedback POST):', err.message);
        return new Response(JSON.stringify({ error: err.message || 'Failed to submit feedback' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}


// --- GET method for retrieving feedback ---
export async function GET(request) {
    // Ensure authentication is set up before any Firestore operation that relies on it
    await ensureAuthenticated(); 

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const userId = searchParams.get('userId'); // Optional: to fetch reviews by a specific user

    if (!locationId && !userId) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: locationId or userId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Access __app_id for the collection path as defined in your global setup
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        // --- FIX: Added 'data' segment to the collection path ---
        const feedbackCollectionRef = collection(db, `artifacts/${appId}/public/data/locationReviews`);
        let q = query(feedbackCollectionRef);

        if (locationId) {
            q = query(q, where('locationId', '==', locationId));
        }
        if (userId) {
            q = query(q, where('userId', '==', userId));
        }

        // IMPORTANT: Avoid using orderBy for real-time applications unless indexes are managed,
        // as it can lead to client-side errors if an index is missing.
        // For simple demos, we'll fetch and sort in memory if needed, but not use orderBy in query here.
        // For now, let's keep it simple and retrieve documents as is.

        const querySnapshot = await getDocs(q);
        const reviews = [];
        querySnapshot.forEach((doc) => {
            reviews.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt in descending order (newest first) in memory
        reviews.sort((a, b) => {
            const dateA = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            const dateB = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            return dateA.getTime() - dateB.getTime();
        });


        return new Response(JSON.stringify(reviews), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('API Route Error (Feedback GET):', err.message);
        return new Response(JSON.stringify({ error: err.message || 'Failed to retrieve feedback' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
