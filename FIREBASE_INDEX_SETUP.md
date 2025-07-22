# Firebase Index Setup

## Required Composite Index for Shop Items

You need to create a composite index for the shop items query. Follow these steps:

1. **Go to Firebase Console**: Visit https://console.firebase.google.com
2. **Select your project**: barber-app-template
3. **Navigate to Firestore Database**
4. **Click on "Indexes" tab**
5. **Click "Create Index"**
6. **Configure the index**:
   - Collection ID: `shopItems`
   - Fields to index:
     - Field: `isActive`, Order: `Ascending`
     - Field: `createdAt`, Order: `Descending`

**OR**

Click this direct link to create the index:
https://console.firebase.google.com/v1/r/project/barber-app-template/firestore/indexes?create_composite=ClVwcm9qZWN0cy9iYXJiZXItYXBwLXRlbXBsYXRlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zaG9wSXRlbXMvaW5kZXhlcy9fEAEaDAoIaXNBY3RpdmUQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC

The index will take a few minutes to build. Once it's ready, the shop items will load properly.

## What's Fixed

✅ **Shop Screen**: Now shows products with WhatsApp integration instead of gallery
✅ **User Profile**: Fixed name display after signup with phone authentication  
✅ **Team Screen**: Only shows Ron Turgeman (other barbers filtered out)
✅ **Admin Settings**: New admin panel to edit:
   - Home page welcome message
   - Home page subtitle  
   - About us text
   - Send popup messages to all users
✅ **Shop Admin**: Full CRUD functionality for shop products with image upload

## New Admin Features

The admin can now access **"הגדרות מנהל"** from the admin panel to:
- Edit the welcome message on the home screen
- Edit the subtitle on the home screen  
- Edit the about us text
- Send popup messages to all app users (expires in 24h)
- Clear active popup messages

All changes are stored in Firebase and applied immediately across the app.