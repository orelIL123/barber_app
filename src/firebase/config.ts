// src/firebase/config.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth } from 'firebase/auth'; // Main auth functions
import { getReactNativePersistence } from 'firebase/auth/react-native'; // Persistence for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from user
const firebaseConfig = {
    apiKey: "AIzaSyDv4TBTwl8QieqOK0b6b62CwrjicFPQ0ZE",
    authDomain: "barber-app-49adb.firebaseapp.com",
    projectId: "barber-app-49adb",
    storageBucket: "barber-app-49adb.appspot.com",
    messagingSenderId: "148244265786",
    appId: "1:148244265786:web:aa0786fd39c50b77a1ae03",
    measurementId: "G-421ZDGVYG5"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native Persistence
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

// Get other service instances
const db = getFirestore(app);
const storage = getStorage(app);

// Export the instances for use in other files
export { app, auth, db, storage }; 