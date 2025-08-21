// scripts/set-admin.js

import { auth } from '../lib/firebaseAdmin.js'; // <-- Import the initialized auth object

const uid = process.argv[2];

if (!uid) {
  console.error('Usage: node scripts/set-admin.js <user-uid>');
  process.exit(1);
}

async function main() {
  try {
    // This is all the script needs to do.
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`✅ Admin claim set for user: ${uid}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin claim:', error);
    process.exit(1);
  }
}

main();