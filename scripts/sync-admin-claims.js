/**
 * One-time script to sync admin custom claims for existing admin users.
 * 
 * Run this ONCE after deploying the new Cloud Functions:
 *   node scripts/sync-admin-claims.js
 * 
 * What it does:
 * - Signs in as the admin user
 * - Calls the syncAdminClaims Cloud Function
 * - This sets { admin: true } on all Firestore users where isAdmin=true
 * - After this, Storage and Firestore rules based on request.auth.token.admin will work
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');
const readline = require('readline');

const firebaseConfig = {
  apiKey: "AIzaSyBiDFQNbnExTE03YS_6xoNE6_RrX4HBN4Q",
  authDomain: "barber-app-template.firebaseapp.com",
  projectId: "barber-app-template",
  storageBucket: "barber-app-template.firebasestorage.app",
  messagingSenderId: "246646930767",
  appId: "1:246646930767:web:d1bdd3b156eda443f2193a",
  measurementId: "G-S6VSPNP5LH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  try {
    console.log('🔧 Admin Claims Sync Script');
    console.log('===========================\n');

    const email = await ask('Admin email: ');
    const password = await ask('Admin password: ');

    console.log('\n🔐 Signing in...');
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    console.log(`✅ Signed in as ${cred.user.email} (uid: ${cred.user.uid})`);

    console.log('\n📡 Calling syncAdminClaims...');
    const syncFn = httpsCallable(functions, 'syncAdminClaims');
    const result = await syncFn({});

    console.log('\n✅ Sync complete!');
    console.log('Results:', JSON.stringify(result.data, null, 2));

    // Force refresh token to pick up the new claims
    const token = await cred.user.getIdToken(true);
    const decoded = JSON.parse(atob(token.split('.')[1]));
    console.log('\n👑 Token claims:', { admin: decoded.admin || false });

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    rl.close();
    process.exit(1);
  }
})();
