# הגדרת Push דרך Cloud Function

## מה נעשה
- נוספה Cloud Function `sendPushNotification` ששולחת Push דרך Expo עם Access Token
- `firebase.ts` מעדכן לקרוא ל־Cloud Function במקום ישירות ל־Expo API

## שלבי הפעלה

### 1. קבלת Expo Access Token
1. היכנס ל־https://expo.dev/accounts/orel895/settings/access-tokens
2. צור Token חדש (או השתמש בקיים)
3. העתק את ה־Token

### 2. הגדרת Token כ־Secret (ללא functions.config המיושן)
```bash
firebase functions:secrets:set EXPO_ACCESS_TOKEN
```
(תתבקש להזין את ה־Token – העתק מהדפדפן)

### 3. Deploy לפונקציות
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 4. עדכון EAS (ללא build חדש)
```bash
eas update --branch production --message "Push via Cloud Function"
```

## הערות
- אין צורך ב־`eas build` – רק EAS update
- ההגדרות (מתי לשלוח, למי) נשארות כפי שהן – הכל עובד לפי הגדרות האדמין
