import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Firebase Collections
export const collections = {
  users: 'users',
  appointments: 'appointments',
  barbers: 'barbers',
  treatments: 'treatments',
  gallery: 'gallery',
  waitlist: 'waitlist',
  settings: 'settings',
} as const;

// Type definitions for Firebase data
export interface User {
  uid: string;
  name: string;
  phone: string;
  photoURL?: string;
  createdAt: any;
  type: 'client' | 'barber' | 'admin';
}

export interface Appointment {
  appointmentId: string;
  clientId: string;
  barberId: string;
  treatmentId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdAt: any;
}

export interface Barber {
  barberId: string;
  name: string;
  photo: string;
  availableSlots: string[];
  availabilityWindow: {
    start: string;
    end: string;
  };
}

export interface Treatment {
  treatmentId: string;
  title: string;
  price: number;
  duration: number;
  image: string;
}

export interface GalleryImage {
  imageId: string;
  url: string;
  uploadedBy: string;
  timestamp: any;
}

export interface WaitlistEntry {
  waitlistId: string;
  clientId: string;
  requestedDate: string;
  requestedTime: string;
  treatmentId: string;
  status: 'waiting' | 'notified' | 'removed';
  createdAt: any;
}

export interface Settings {
  maxBookingDaysAhead: number;
  showGallery: boolean;
  homepageBanner: string;
}

export default app; 