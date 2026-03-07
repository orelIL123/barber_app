import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// getReactNativePersistence is exported from the react-native bundle of firebase/auth.
// Metro automatically resolves the "react-native" condition in @firebase/auth's package.json.
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBiDFQNbnExTE03YS_6xoNE6_RrX4HBN4Q",
  authDomain: "barber-app-template.firebaseapp.com",
  projectId: "barber-app-template",
  storageBucket: "barber-app-template.firebasestorage.app",
  messagingSenderId: "246646930767",
  appId: "1:246646930767:web:d1bdd3b156eda443f2193a",
  measurementId: "G-S6VSPNP5LH"
};

// Initialize Firebase App — singleton guard
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth.
// On React Native we use getReactNativePersistence(AsyncStorage) so the session
// survives app restarts. initializeAuth throws "already-initialized" if another
// module already called it — in that case we simply reuse the existing instance.
let auth: Auth;
if (Platform.OS !== 'web') {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
    console.log('✅ Firebase Auth: Initialized with React Native AsyncStorage persistence');
  } catch {
    auth = getAuth(app);
    console.log('✅ Firebase Auth: Reusing existing auth instance');
  }
} else {
  auth = getAuth(app);
  console.log('✅ Firebase Auth: Initialized for web');
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;