/*
// Commenting out the entire file as it depends on Firebase
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    User as FirebaseAuthUser // Rename to avoid conflict with our User type
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    serverTimestamp // Import serverTimestamp
} from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from './config'; // Import initialized instances
import { User } from '../types/user'; // Assuming User type is defined
import { Service } from '../types/service'; // Assuming Service type is defined
import { Appointment } from '../types/appointment'; // Assuming Appointment type is defined

// Authentication
export const signUp = async (email: string, password: string, displayName: string): Promise<FirebaseAuthUser | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      role: 'client', // Default role for sign-up
      createdAt: serverTimestamp(), // Use imported serverTimestamp
    });

    Alert.alert("Success", "Account created successfully!");
    return user;
  } catch (error: any) { // Add type annotation for error
    console.error("Sign up error:", error);
    Alert.alert("Sign up failed", error.message || "Please try again.");
    return null;
  }
};

export const signIn = async (email: string, password: string): Promise<FirebaseAuthUser | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) { // Add type annotation for error
    console.error("Sign in error:", error);
    Alert.alert("Sign in failed", error.message || "Invalid email or password.");
    return null;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) { // Add type annotation for error
    console.error("Sign out error:", error);
    Alert.alert("Sign out failed", error.message || "Could not sign out.");
  }
};

// Firestore Operations
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { uid: docSnap.id, ...data } as User;
    } else {
      console.log("No such user document!");
      return null;
    }
  } catch (error: any) { // Add type annotation for error
    console.error("Error getting user data: ", error);
    return null;
  }
};

export const getServices = async (): Promise<Service[]> => {
  try {
    const servicesCol = collection(db, 'services');
    const serviceSnapshot = await getDocs(servicesCol);
    return serviceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
  } catch (error: any) { // Add type annotation for error
    console.error("Error getting services: ", error);
    return [];
  }
};

export const getStaff = async (): Promise<User[]> => {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('role', '==', 'staff'));
    const staffSnapshot = await getDocs(q);
    return staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error: any) { // Add type annotation for error
    console.error("Error getting staff: ", error);
    return [];
  }
};

export const bookAppointment = async (appointmentData: Omit<Appointment, 'id'>): Promise<string | null> => {
  try {
    const appointmentsCol = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsCol, appointmentData); 
    return docRef.id;
  } catch (error: any) { // Add type annotation for error
    console.error("Error booking appointment: ", error);
    Alert.alert("Booking Failed", "Could not book the appointment. Please try again.");
    return null;
  }
};

export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
  try {
    const appointmentsCol = collection(db, 'appointments');
    const q = query(appointmentsCol, where('userId', '==', userId));
    const appointmentSnapshot = await getDocs(q);
    return appointmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
  } catch (error: any) { // Add type annotation for error
    console.error("Error getting user appointments: ", error);
    return [];
  }
};

// Add more service functions as needed (e.g., update user profile, get staff availability, etc.)

*/ 