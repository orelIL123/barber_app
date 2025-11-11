// Quick script to check a specific user in Firebase
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json'); // You'll need this file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUser(phone) {
  try {
    console.log(`🔍 Searching for user with phone: ${phone}`);
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`📊 Total users in database: ${usersSnapshot.size}`);
    
    // Find user by phone
    let found = false;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.phone && data.phone.includes(phone)) {
        found = true;
        console.log(`\n✅ Found user!`);
        console.log(`📋 User ID: ${doc.id}`);
        console.log(`👤 Display Name: ${data.displayName || 'N/A'}`);
        console.log(`📱 Phone: ${data.phone}`);
        console.log(`📧 Email: ${data.email || 'N/A'}`);
        console.log(`👨‍💼 Is Admin: ${data.isAdmin || false}`);
        console.log(`📅 Created At: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
        console.log(`\n📄 Full Data:`);
        console.log(JSON.stringify(data, null, 2));
      }
    });
    
    if (!found) {
      console.log(`\n❌ User with phone ${phone} not found in database`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
const phoneToSearch = process.argv[2] || '0523985505';
checkUser(phoneToSearch);




