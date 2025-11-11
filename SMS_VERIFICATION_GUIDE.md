# מדריך SMS Verification - איך זה עובד

## סקירה כללית

המערכת משתמשת ב-**SMS4Free** API לשליחת קודי אימות SMS למשתמשים בעת הרשמה. הקוד נשלח, נשמר ב-AsyncStorage, ואומת כחלק מתהליך ההרשמה.

---

## ארכיטקטורה

### 1. **שליחת SMS** (`sendSMSVerification`)
- **מיקום**: `services/firebase.ts` (שורות 398-459)
- **תפקיד**: יוצר קוד אימות 6 ספרות, שולח SMS דרך SMS4Free, ושומר את הקוד ב-AsyncStorage

### 2. **אימות קוד** (`verifySMSCode`)
- **מיקום**: `services/firebase.ts` (שורות 461-587)
- **תפקיד**: בודק אם הקוד שהמשתמש הזין תואם לקוד שנשלח ונשמר

### 3. **הרשמה עם טלפון** (`registerUserWithPhone`)
- **מיקום**: `services/firebase.ts` (שורות 589-690)
- **תפקיד**: מאמת את הקוד, ואז יוצר משתמש ב-Firebase Auth עם אימייל זמני

### 4. **SMS Provider** (`SMS4FreeProvider`)
- **מיקום**: `app/services/messaging/providers/sms4freeProvider.ts`
- **תפקיד**: מטפל בתקשורת עם SMS4Free API

---

## תהליך הרשמה - צעד אחר צעד

### שלב 1: המשתמש מזין פרטים
```typescript
// RegisterScreen.tsx - handleSendVerification
const result = await sendSMSVerification(phone);
```

### שלב 2: יצירת קוד אימות
```typescript
// services/firebase.ts - sendSMSVerification
const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
const verificationId = `sms4free_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### שלב 3: נרמול מספר טלפון
```typescript
// ממיר מספר טלפון לפורמט בינלאומי
// 0523985505 -> +972523985505
// 972523985505 -> +972523985505
```

### שלב 4: שליחת SMS דרך SMS4Free
```typescript
const smsMessage = `קוד האימות שלך: ${verificationCode}\nתוקף 10 דקות\n- רון תורגמן מספרה`;

const result = await messagingService.sendMessage({
  to: formattedPhone,
  message: smsMessage
});
```

### שלב 5: שמירת קוד ב-AsyncStorage
```typescript
const verificationData = {
  code: String(verificationCode),
  phone: formattedPhone,
  timestamp: Date.now()
};

await AsyncStorage.setItem(`verification_${verificationId}`, JSON.stringify(verificationData));
```

### שלב 6: המשתמש מזין קוד
```typescript
// RegisterScreen.tsx - handleVerifyAndRegister
await registerUserWithPhone(phone, fullName, verificationId, verificationCode, password);
```

### שלב 7: אימות קוד
```typescript
// services/firebase.ts - verifySMSCode
const storedData = await AsyncStorage.getItem(`verification_${verificationId}`);
const verificationData = JSON.parse(storedData);

// בדיקת התאמה
if (storedCode !== normalizedCode) {
  throw new Error('Invalid verification code');
}

// בדיקת תוקף (10 דקות)
const tenMinutes = 10 * 60 * 1000;
if (verificationAge > tenMinutes) {
  throw new Error('Verification code expired');
}
```

### שלב 8: יצירת משתמש ב-Firebase
```typescript
// services/firebase.ts - registerUserWithPhone
const tempEmail = `972${cleanPhone}@ronbarber.app`;
const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, userPassword);

// שמירת פרופיל משתמש
const userProfile: UserProfile = {
  uid: user.uid,
  email: tempEmail,
  displayName: displayName,
  phone: normalizedPhone,
  isAdmin: isAdminPhone,
  hasPassword: true,
  createdAt: Timestamp.now()
};

await setDoc(doc(db, 'users', user.uid), userProfile);
```

---

## קונפיגורציה

### קובץ: `app/config/messaging.ts`
```typescript
export const messagingConfig: MessagingConfig = {
  providers: {
    sms4free: {
      apiKey: process.env.SMS4FREE_API_KEY || 'mgfwkoRBI',
      user: process.env.SMS4FREE_USER || '0523985505',
      pass: process.env.SMS4FREE_PASS || '73960779',
      sender: process.env.SMS4FREE_SENDER || 'ToriX',
      enabled: true,
    },
  },
  defaultProvider: 'sms4free',
};
```

### משתני סביבה (.env)
```env
SMS4FREE_API_KEY=mgfwkoRBI
SMS4FREE_USER=0523985505
SMS4FREE_PASS=73960779
SMS4FREE_SENDER=ToriX
```

---

## SMS4Free API

### תיעוד API
- **קישור לדוקומנטציה**: https://www.sms4free.co.il/outcome-sms-api

### Endpoint
```
POST https://api.sms4free.co.il/ApiSMS/v2/SendSMS
```

### Request Body
```json
{
  "key": "mgfwkoRBI",
  "user": "0523985505",
  "pass": "73960779",
  "sender": "ToriX",
  "recipient": "0523985505",
  "msg": "קוד האימות שלך: 123456\nתוקף 10 דקות\n- רון תורגמן מספרה"
}
```

### Response
```json
{
  "status": 12345,  // מספר חיובי = הצלחה
  "message": "SMS sent successfully"
}
```

### המרת מספר טלפון
- **קלט**: `+972523985505` (פורמט בינלאומי)
- **פלט ל-API**: `0523985505` (פורמט ישראלי מקומי)
- **לוגיקה**: אם מתחיל ב-`+972`, מחליף ל-`0` + שאר הספרות

---

## מבנה קבצים

```
barber_app/
├── services/
│   └── firebase.ts
│       ├── sendSMSVerification()      // שליחת SMS
│       ├── verifySMSCode()            // אימות קוד
│       └── registerUserWithPhone()    // הרשמה עם טלפון
│
├── app/
│   ├── config/
│   │   └── messaging.ts              // קונפיגורציה
│   │
│   ├── services/
│   │   └── messaging/
│   │       ├── service.ts            // MessagingService class
│   │       ├── types.ts              // Type definitions
│   │       └── providers/
│   │           └── sms4freeProvider.ts  // SMS4Free implementation
│   │
│   └── screens/
│       └── RegisterScreen.tsx         // מסך הרשמה
│
└── .env                              // משתני סביבה
```

---

## שימוש ב-API

### 1. Import הפונקציות
```typescript
import { sendSMSVerification, registerUserWithPhone } from '../../services/firebase';
```

### 2. שליחת SMS
```typescript
const result = await sendSMSVerification(phoneNumber);
// מחזיר: { verificationId: "sms4free_1234567890_abc123" }
```

### 3. אימות והרשמה
```typescript
await registerUserWithPhone(
  phoneNumber,      // מספר טלפון
  displayName,      // שם מלא
  verificationId,   // מה-sendSMSVerification
  verificationCode, // מה שהמשתמש הזין
  password          // סיסמה שהמשתמש בחר
);
```

---

## אבטחה

### 1. **תוקף קוד**: 10 דקות
```typescript
const tenMinutes = 10 * 60 * 1000;
if (verificationAge > tenMinutes) {
  throw new Error('Verification code expired');
}
```

### 2. **ניקוי אוטומטי**: הקוד נמחק אחרי הרשמה מוצלחת
```typescript
await AsyncStorage.removeItem(`verification_${verificationId}`);
```

### 3. **נרמול קוד**: הסרת תווים לא מספריים
```typescript
const normalizedCode = String(verificationCode).trim().replace(/\D/g, '');
```

### 4. **אימייל זמני**: משתמשים נרשמים עם אימייל זמני
```typescript
const tempEmail = `972${cleanPhone}@ronbarber.app`;
```

---

## טיפול בשגיאות

### שגיאות נפוצות:
1. **"Invalid verification code"** - קוד שגוי
2. **"Verification code expired"** - קוד פג תוקף (יותר מ-10 דקות)
3. **"Verification ID not found"** - verificationId לא נמצא ב-AsyncStorage
4. **"Failed to send SMS"** - שגיאה בשליחת SMS דרך SMS4Free

### לוגים לדיבוג:
```typescript
console.log('📱 Sending SMS to:', formattedPhone);
console.log('🔐 Generated verification code:', verificationCode);
console.log('🆔 Generated verification ID:', verificationId);
console.log('💾 Verification data stored for ID:', verificationId);
```

---

## דוגמת קוד מלאה

```typescript
// 1. שליחת SMS
const handleSendVerification = async () => {
  const result = await sendSMSVerification(phone);
  setVerificationId(result.verificationId);
  setStep('verification');
};

// 2. אימות והרשמה
const handleVerifyAndRegister = async () => {
  await registerUserWithPhone(
    phone,
    fullName,
    verificationId,
    verificationCode,
    password
  );
  // המשתמש נרשם בהצלחה!
};
```

---

## הערות חשובות

1. **SMS4Free דורש פורמט ישראלי** (0523985505) ולא בינלאומי (+972523985505)
2. **הקוד נשמר כמחרוזת** ב-AsyncStorage כדי למנוע בעיות השוואה
3. **תוקף הקוד הוא 10 דקות** - אחרי זה צריך לשלוח קוד חדש
4. **האימייל הזמני** נוצר בפורמט: `972{phone}@ronbarber.app`
5. **נרמול מספר טלפון** חשוב מאוד - כל המספרים נשמרים בפורמט `+972...`

---

## התקנה לפרויקט חדש

### 1. העתק קבצים:
- `app/services/messaging/` - כל התיקייה
- `app/config/messaging.ts`
- הפונקציות מ-`services/firebase.ts`:
  - `sendSMSVerification`
  - `verifySMSCode`
  - `registerUserWithPhone`

### 2. התקן dependencies:
```bash
npm install @react-native-async-storage/async-storage
```

### 3. הגדר משתני סביבה:
```env
SMS4FREE_API_KEY=your_api_key
SMS4FREE_USER=your_user
SMS4FREE_PASS=your_password
SMS4FREE_SENDER=your_sender_name
```

### 4. עדכן את ה-import paths:
- התאם את הנתיבים לפי המבנה של הפרויקט שלך

---

## סיכום

המערכת משתמשת ב-SMS4Free API לשליחת קודי אימות SMS. הקוד נשלח, נשמר ב-AsyncStorage עם תוקף של 10 דקות, ובזמן הרשמה נבדק ונמחק. המשתמש נרשם עם אימייל זמני ב-Firebase Auth, והמספר טלפון נשמר בפורמט בינלאומי נורמלי.

