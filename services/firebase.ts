import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  createdAt: Timestamp;
}

export interface Barber {
  id: string;
  name: string;
  image: string;
  specialties: string[];
  experience: string;
  rating: number;
  available: boolean;
}

export interface Treatment {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  image: string;
}

export interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  treatmentId: string;
  date: Timestamp;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Timestamp;
}

// Auth functions
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (email: string, password: string, displayName: string, phone: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, {
      displayName: displayName
    });
    
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName,
      phone: phone,
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    return user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// User profile functions
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, updates);
  } catch (error) {
    throw error;
  }
};

// Barbers functions
export const getBarbers = async (): Promise<Barber[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'barbers'));
    const barbers: Barber[] = [];
    
    querySnapshot.forEach((doc) => {
      barbers.push({
        id: doc.id,
        ...doc.data()
      } as Barber);
    });
    
    return barbers;
  } catch (error) {
    console.error('Error getting barbers:', error);
    return [];
  }
};

export const getBarber = async (barberId: string): Promise<Barber | null> => {
  try {
    const docRef = doc(db, 'barbers', barberId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Barber;
    }
    return null;
  } catch (error) {
    console.error('Error getting barber:', error);
    return null;
  }
};

// Treatments functions
export const getTreatments = async (): Promise<Treatment[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'treatments'));
    const treatments: Treatment[] = [];
    
    querySnapshot.forEach((doc) => {
      treatments.push({
        id: doc.id,
        ...doc.data()
      } as Treatment);
    });
    
    return treatments;
  } catch (error) {
    console.error('Error getting treatments:', error);
    return [];
  }
};

// Appointments functions
export const createAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
  try {
    const appointment = {
      ...appointmentData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'appointments'), appointment);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as Appointment);
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting user appointments:', error);
    return [];
  }
};

export const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    await updateDoc(docRef, updates);
  } catch (error) {
    throw error;
  }
};

export const deleteAppointment = async (appointmentId: string) => {
  try {
    await deleteDoc(doc(db, 'appointments', appointmentId));
  } catch (error) {
    throw error;
  }
};

// Gallery functions
export const getGalleryImages = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'gallery'));
    const images: any[] = [];
    
    querySnapshot.forEach((doc) => {
      images.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return images;
  } catch (error) {
    console.error('Error getting gallery images:', error);
    return [];
  }
};