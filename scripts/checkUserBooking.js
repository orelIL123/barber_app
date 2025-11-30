const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUserAndBooking(phoneNumber) {
  try {
    console.log(`\n🔍 בודק משתמש עם מספר טלפון: ${phoneNumber}\n`);

    // Generate all possible phone formats
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const possiblePhones = [
      phoneNumber, // Original format
      `+972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`, // +972 format
      `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`, // 972 format
      `0${cleanPhone.startsWith('972') ? cleanPhone.substring(3) : cleanPhone}`, // 0 format
      cleanPhone // Just numbers
    ];

    console.log(`📱 פורמטי טלפון לבדיקה:`, possiblePhones.join(', '));
    console.log('');

    const usersRef = db.collection('users');
    const foundUsers = [];

    // Check each phone format
    for (const phoneFormat of possiblePhones) {
      try {
        const q = usersRef.where('phone', '==', phoneFormat);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const userData = doc.data();
            foundUsers.push({
              uid: doc.id,
              ...userData
            });
          });
        }
      } catch (error) {
        console.log(`⚠️ שגיאה בחיפוש פורמט ${phoneFormat}:`, error.message);
      }
    }

    if (foundUsers.length === 0) {
      console.log('❌ לא נמצא משתמש עם מספר הטלפון הזה');
      
      // Try to find by email
      const possibleEmails = [
        `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}@ronbarber.app`,
        `${cleanPhone}@ronbarber.app`,
        `${cleanPhone}@sms.barbershop.local`,
        `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}@sms.barbershop.local`,
      ];
      
      console.log('\n🔍 בודק לפי אימייל...');
      for (const emailFormat of possibleEmails) {
        try {
          const q = usersRef.where('email', '==', emailFormat);
          const querySnapshot = await q.get();
          if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
              const userData = doc.data();
              foundUsers.push({
                uid: doc.id,
                ...userData
              });
            });
          }
        } catch (error) {
          console.log(`⚠️ שגיאה בחיפוש אימייל ${emailFormat}:`, error.message);
        }
      }
    }

    if (foundUsers.length === 0) {
      console.log('\n❌ לא נמצא משתמש בכל הפורמטים');
      return;
    }

    console.log(`\n✅ נמצאו ${foundUsers.length} משתמש/ים:\n`);

    // Display all found users
    for (let i = 0; i < foundUsers.length; i++) {
      const user = foundUsers[i];
      console.log(`--- משתמש ${i + 1} ---`);
      console.log(`UID: ${user.uid}`);
      console.log(`שם: ${user.displayName || 'ללא שם'}`);
      console.log(`טלפון: ${user.phone || 'ללא טלפון'}`);
      console.log(`אימייל: ${user.email || 'ללא אימייל'}`);
      console.log(`Admin: ${user.isAdmin ? 'כן' : 'לא'}`);
      console.log(`Push Token: ${user.pushToken ? 'יש' : 'אין'}`);
      console.log(`נוצר: ${user.createdAt ? user.createdAt.toDate().toLocaleString('he-IL') : 'לא ידוע'}`);
      console.log('');
    }

    // Check for duplicate UIDs in Firebase Auth
    if (foundUsers.length > 1) {
      console.log('⚠️ אזהרה: נמצאו כמה משתמשים עם אותו מספר טלפון!');
      console.log('זה יכול לגרום לבעיות בקביעת תורים.\n');
    }

    // Check appointments for each user
    console.log('📅 בודק תורים לכל משתמש:\n');
    const appointmentsRef = db.collection('appointments');
    
    for (const user of foundUsers) {
      try {
        const appointmentsQuery = appointmentsRef.where('userId', '==', user.uid);
        const appointmentsSnapshot = await appointmentsQuery.get();
        
        console.log(`משתמש: ${user.displayName} (${user.uid})`);
        console.log(`  מספר תורים: ${appointmentsSnapshot.size}`);
        
        if (appointmentsSnapshot.size > 0) {
          console.log('  תורים:');
          appointmentsSnapshot.forEach((doc) => {
            const appointment = doc.data();
            const date = appointment.date ? appointment.date.toDate() : null;
            console.log(`    - ${date ? date.toLocaleString('he-IL') : 'תאריך לא תקין'} (${appointment.status || 'ללא סטטוס'})`);
          });
        }
        console.log('');
      } catch (error) {
        console.log(`  ❌ שגיאה בבדיקת תורים: ${error.message}`);
      }
    }

    // Check Firebase Auth users
    console.log('🔐 בודק ב-Firebase Authentication:\n');
    try {
      for (const user of foundUsers) {
        let authUser = null;
        try {
          authUser = await admin.auth().getUser(user.uid);
          console.log(`משתמש: ${user.displayName} (${user.uid})`);
          console.log(`  קיים ב-Auth: כן`);
          console.log(`  אימייל ב-Auth: ${authUser.email || 'ללא'}`);
          console.log(`  טלפון ב-Auth: ${authUser.phoneNumber || 'ללא'}`);
          console.log(`  Disabled: ${authUser.disabled ? 'כן' : 'לא'}`);
          console.log('');
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            console.log(`משתמש: ${user.displayName} (${user.uid})`);
            console.log(`  ❌ לא קיים ב-Auth!`);
            console.log('');
          } else {
            throw authError;
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ שגיאה בבדיקת Auth: ${error.message}`);
    }

    // Recommendations
    console.log('\n💡 המלצות:\n');
    if (foundUsers.length > 1) {
      console.log('1. יש כמה משתמשים עם אותו מספר טלפון - צריך למחוק את הכפילויות');
      console.log('2. השאר רק את המשתמש עם ה-UID החדש ביותר');
    }
    
    const usersWithoutAuth = [];
    for (const user of foundUsers) {
      try {
        await admin.auth().getUser(user.uid);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          usersWithoutAuth.push(user);
        }
      }
    }
    
    if (usersWithoutAuth.length > 0) {
      console.log('3. יש משתמשים שלא קיימים ב-Auth - צריך למחוק אותם או ליצור אותם מחדש');
    }

    const usersWithoutPushToken = foundUsers.filter(u => !u.pushToken);
    if (usersWithoutPushToken.length > 0) {
      console.log('4. יש משתמשים ללא Push Token - זה יכול לגרום לבעיות בהתראות');
    }

  } catch (error) {
    console.error('❌ שגיאה כללית:', error);
  }
}

// Get phone number from command line arguments
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.log('שימוש: node checkUserBooking.js <מספר_טלפון>');
  console.log('דוגמה: node checkUserBooking.js 0559274580');
  process.exit(1);
}

checkUserAndBooking(phoneNumber)
  .then(() => {
    console.log('\n✅ הבדיקה הושלמה');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  });

