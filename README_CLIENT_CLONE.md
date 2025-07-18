# הוראות לשכפול פרויקט ללקוח חדש (ברבר)

## 1. שכפול קוד הפרויקט
- העתק את תיקיית הטמפלייט (`appTamplate`) למיקום חדש בשם הלקוח/הפרויקט.
- אתחל ריפוזיטורי git חדש (אם צריך):
  ```sh
  git init
  git remote add origin <REPO_URL>
  git add .
  git commit -m "init client project"
  git push -u origin master
  ```

## 2. יצירת פרויקט חדש ב-Firebase
- היכנס ל-[Firebase Console](https://console.firebase.google.com/)
- צור פרויקט חדש (שם ייחודי ללקוח)
- הפעל את השירותים הבאים:
  - **Authentication** (טלפון/אימייל)
  - **Cloud Firestore**
  - **Storage**

## 3. הגדרות חובה בפיירבייס
### Authentication
- אפשר כניסה עם טלפון (SMS) ו/או אימייל-סיסמה.
- הגדר תבניות SMS מותאמות (אם צריך).

### Firestore
- צור את הקולקציות הבאות (אם לא נוצרות אוטומטית):
  - `barbers` (ספרים)
  - `treatments` (טיפולים)
  - `appointments` (תורים)
  - `gallery` (תמונות)
  - `users` (משתמשים)
  - `settings` (הגדרות כלליות)

#### דוגמה למבנה מסמך barber:
```
{
  id: "abc123",
  name: "רון תורגמן",
  image: "https://...",
  experience: "10 שנות ניסיון",
  rating: 5,
  available: true,
  phone: "+9725..."
}
```

#### דוגמה לטיפול:
```
{
  id: "cut1",
  name: "תספורת גבר",
  duration: 20,
  price: 70,
  description: "תספורת מקצועית",
  image: "https://..."
}
```

### Storage
- צור תיקיות: `barbers/`, `gallery/`, `treatments/` (לשמור תמונות)
- העלה תמונות ברירת מחדל (אם צריך)

### חוקי אבטחה (דוגמה בסיסית):
```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 4. ייבוא/העתקת נתוני ברירת מחדל
- ניתן להשתמש בסקריפטים בתיקיית `scripts/` (למשל: `seedData.js`, `addAvihuBarber.js`)
- להריץ אותם עם node:
  ```sh
  node scripts/seedData.js
  ```
- או להוסיף ידנית דרך Firebase Console.

## 5. עדכון קבצי קונפיגורציה בקוד
- פתח את `app/config/firebase.ts` ועדכן את האובייקט `firebaseConfig` בפרטי הפרויקט החדש (apiKey, projectId, וכו').
- ודא שכל המפתחות נכונים (ניתן להעתיק מה-Project Settings ב-Firebase).

## 6. בדיקות ראשוניות
- הרץ את האפליקציה:
  ```sh
  npm install
  npx expo start
  ```
- ודא שניתן להתחבר, להירשם, להזמין תור, לראות ספרים וטיפולים.

## 7. מה יש כבר בפיירבייס (ברירת מחדל)
- ברירת מחדל: ספר אחד (רון תורגמן), טיפול אחד, תמונת גלריה אחת.
- ניתן להרחיב/לשנות דרך הפאנל ניהול או ישירות ב-Firebase.

## 8. טיפים והערות
- לא להעלות קבצי סביבה רגישים (env, מפתחות) ל-git ציבורי.
- מומלץ להגדיר משתמש אדמין ראשון ידנית ב-Firebase.
- ניתן להוסיף/להסיר טיפולים, ספרים, תמונות דרך הפאנל ניהול.
- לשאלות – פנה למפתח הטמפלייט.

## 9. תורים חכמים (חסימת משבצות לפי משך טיפול)
- כל תור שנשמר ב-Firestore חייב לכלול שדה duration (מספר, דקות).
- מערכת ההזמנות בודקת חפיפת תורים: כל טיפול חוסם את כל משך הזמן שלו, ולא ניתן לקבוע תור חופף.
- המשבצות הפנויות מוצגות ללקוח רק אם אין אף תור קיים שחופף להן (גם אם התור הקיים הוא באורך שונה!).
- דוגמה למסמך appointment:
```
{
  appointmentId: "...",
  barberId: "...",
  clientId: "...",
  treatmentId: "...",
  date: "2024-06-01T09:00:00.000Z",
  duration: 30, // דקות
  status: "scheduled",
  createdAt: ...
}
```
- חשוב: אם לא תשתמש בשדה duration, המערכת לא תדע לחסום תורים חופפים!

---
בהצלחה! 🚀 