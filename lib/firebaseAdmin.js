// lib/firebaseAdmin.js

import admin from 'firebase-admin';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- IMPORTANT: This must be at the top ---
// Explicitly load environment variables from the project root's .env file.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// ------------------------------------------

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = admin.auth();
const adminAuth = admin.auth(); // Ensure this is the correct reference for the auth object
const verifyAdmin = async (req) => {
  // For App Router, headers are accessed with the .get() method
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    const error = new Error('Permission denied. No token provided.');
    error.code = 'permission-denied';
    throw error;
  }
  const token = authorization.split('Bearer ')[1];
  
  // This part remains the same
  const decodedToken = await admin.auth().verifyIdToken(token);

  if (decodedToken.admin !== true) {
    const error = new Error('Permission denied. User is not an admin.');
    error.code = 'permission-denied';
    throw error;
  }
  return decodedToken;
};

// Make sure the rest of your firebaseAdmin.js file (initialization, other exports) remains the same
export { db, auth, adminAuth, verifyAdmin };