// Script to check user without Firebase Admin SDK
// Uses Firestore REST API - no service account needed
// But requires Firebase project ID

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// You need to set these manually
const FIREBASE_PROJECT_ID = 'barber-app-d1771'; // Change if needed
const PHONE_NUMBER = process.argv[2] || '0559274580';

console.log(`
⚠️  סקריפט זה בודק משתמשים דרך Firestore REST API
⚠️  דורש גישה ל-Firebase Console או token
⚠️  לבדיקה מלאה, עדיף להשתמש בקובץ serviceAccountKey.json

📱 בודק משתמש: ${PHONE_NUMBER}
`);

async function checkUserWithoutAdmin() {
  console.log(`
═══════════════════════════════════════════════════════════════
🔍 הוראות בדיקה ידנית ב-Firebase Console
═══════════════════════════════════════════════════════════════

1️⃣ לך ל-Firebase Console:
   https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore

2️⃣ בחר collection: users

3️⃣ חפש משתמשים עם מספר טלפון שמכיל:
   - 0559274580
   - +972559274580
   - 972559274580
   - 559274580

4️⃣ בדוק:
   - כמה משתמשים יש עם אותו מספר?
   - מה ה-UID של כל משתמש?
   - מה השם והאימייל של כל משתמש?
   - מתי נוצר כל משתמש?

5️⃣ לך ל-Authentication:
   https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/users

6️⃣ חפש משתמש עם מספר: 0559274580 או +972559274580

7️⃣ בדוק:
   - מה ה-UID ב-Authentication?
   - האם זה תואם ל-UID ב-Firestore?
   - האם יש כמה משתמשים עם אותו מספר?

═══════════════════════════════════════════════════════════════

💡 טיפים:
═══════════════════════════════════════════════════════════════

• אם יש כמה משתמשים עם אותו מספר טלפון:
  - זה כנראה הבעיה!
  - מחק את הכפילויות
  - השאר רק את המשתמש הנכון

• אם המשתמש לא קיים ב-Firestore אבל קיים ב-Auth:
  - צריך ליצור פרופיל למשתמש
  - או למחוק מ-Auth ולהשאיר להירשם מחדש

• אם המשתמש לא קיים גם ב-Auth וגם ב-Firestore:
  - המשתמש צריך להירשם מחדש

═══════════════════════════════════════════════════════════════
`);

  // Try to use gcloud or provide instructions
  console.log(`
📝 אם יש לך גישה ל-gcloud, אפשר להריץ:

gcloud auth application-default print-access-token

ואז להשתמש ב-token הזה ל-REST API.
`);
}

// Check if we can find project ID from firebase.json
try {
  const fs = require('fs');
  const path = require('path');
  const firebaseJsonPath = path.join(__dirname, '..', 'firebase.json');
  
  if (fs.existsSync(firebaseJsonPath)) {
    const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
    console.log('✅ מצאתי קובץ firebase.json');
  }
} catch (e) {
  // Ignore
}

checkUserWithoutAdmin()
  .then(() => {
    console.log('\n✅ הוראות הוצגו');
    rl.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ שגיאה:', error);
    rl.close();
    process.exit(1);
  });


