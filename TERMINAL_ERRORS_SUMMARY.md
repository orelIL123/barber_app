# סיכום שגיאות מהטרמינל

## 1. שגיאת Push – 403 Insufficient permissions

```
ERROR  📱 Push API error 403
"Insufficient permissions to send push notifications to @orel895/barber_app"
```

**מה קורה:**  
השליחה ל-Expo Push נעשית **מהקליינט** (מ-`firebase.ts` → `fetch('https://exp.host/--/api/v2/push/send')`).

**למה זה נכשל:**
- אצלך כנראה מופעל **Push Security** בפרויקט Expo
- במצב כזה Expo דורש **Access Token** בשביל לשלוח התראות
- Token כזה לא מגיע מהאפליקציה, אלא רק משרת/Cloud Function

**מה צריך לעשות:**  
להעביר את שליחת ההתראות ל-**Cloud Function** שמשתמש ב-`expo-server-sdk` עם ה-Access Token, ולקרוא אליו מהאפליקציה. כרגע אין לך Cloud Function כזו.

---

## 2. Cloud Functions שלך היום

בקבצי `functions/src/index.ts` יש רק:
- `deleteUserAuth`
- `updateEmailAndSendReset`

אין פונקציה ששולחת Push. כל שליחת Push נעשית מהקליינט → Expo API → 403.

---

## 3. Firestore – Missing or insufficient permissions

```
WARN  Failed to preload content: [FirebaseError: Missing or insufficient permissions.]
ERROR  Error processing scheduled reminders: [FirebaseError: Missing or insufficient permissions.]
ERROR  Error getting barbers: [FirebaseError: Missing or insufficient permissions.]
WARN  Failed to preload images: [FirebaseError: Missing or insufficient permissions.]
```

**סיבה:**  
ה-preload רץ **לפני** שהמשתמש מחובר, והכללים ב-Firestore לא מאפשרים קריאה בלי אימות.

**פתרון אפשרי:**  
להפעיל preload רק אחרי התחברות, או לפתוח read לציבור לגבי נתונים לא רגישים (gallery, barbers וכו').

---

## 4. Firebase Auth – Expected a class definition

```
ERROR  @firebase/auth: INTERNAL ASSERTION FAILED: Expected a class definition
ERROR  Error setting auth persistence
```

**מה זה:**  
שגיאה פנימית של Firebase Auth, לרוב בגלל:
- import לא נכון
- התנגשות גרסאות

צריך לבדוק imports ו-dependency של `firebase/auth` ו-`@firebase/auth`.

---

## 5. Layout – No route named "booking"

```
WARN  [Layout children]: No route named "booking" exists in nested children
```

**מה קורה:**  
הניווט מנסה להגיע ל-`"booking"` אבל בתוך ה-tabs אין route בשם הזה. כנראה צריך:
- קובץ `app/(tabs)/booking.tsx`, או
- `router.push('/booking')` במקום `router.replace('/(tabs)/booking')` (אם `/booking` הוא route נפרד).

---

## 6. Push – Must use physical device

```
LOG  ⚠️ Must use physical device for Push Notifications
LOG  ❌ Cannot register push token without permissions
LOG  📱 Not a physical device, skipping push notification registration
```

**פירוש:**  
הרצה על סימולטור. Push Notifications לא נתמך בסימולטור, צריך מכשיר אמיתי.

---

# סדר עדיפויות לתיקון

| עדיפות | נושא | מה לעשות |
|--------|------|----------|
| 1 | Push 403 | ליצור Cloud Function לשליחת Push עם expo-server-sdk + Access Token |
| 2 | Firestore rules | להפעיל preload אחרי auth, או לפתוח read לנתונים ציבוריים |
| 3 | "booking" route | לתקן ניווט ל-booking |
| 4 | Firebase Auth | לבדוק imports והתקנות של firebase/auth |
