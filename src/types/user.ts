// import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'; // Commented out

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'admin' | 'staff' | 'client'; // Adjust roles as needed
    staffDetails?: {
        specialty: string;
        // Add other staff-specific details
    };
    // Add other relevant user details
    createdAt: any; // Consider using Date or a specific timestamp type if possible, commented out Firestore type
    lastLoginAt?: any; // Consider using Date, commented out Firestore type
} 