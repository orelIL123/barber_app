import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  profileImage?: string;
  isAdmin?: boolean;
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
  pricing?: { [treatmentId: string]: number }; // Custom pricing per treatment
  phone?: string; // Phone number for contact
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

export interface GalleryImage {
  id: string;
  imageUrl: string;
  type: 'gallery' | 'background' | 'splash';
  order: number;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface BarberAvailability {
  id: string;
  barberId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
  isAvailable: boolean;
  createdAt: Timestamp;
}

export interface AppSettings {
  id: string;
  key: string;
  value: any;
  updatedAt: Timestamp;
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
    
    // Check if this is the admin email
    const isAdminEmail = email === 'orel895@gmail.com';
    
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName,
      phone: phone,
      isAdmin: isAdminEmail, // Automatically set admin for specific email
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

// Get all users for admin
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      } as UserProfile);
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
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
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as Appointment);
    });
    
    // Sort by date in JavaScript instead of Firestore
    appointments.sort((a, b) => {
      if (a.date && b.date) {
        // Handle both Timestamp objects and regular Date objects
        const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
        return bTime - aTime;
      }
      return 0;
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

// Admin functions
export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      return userData.isAdmin || false;
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Update existing user to admin
export const makeUserAdmin = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(userDoc.ref, { isAdmin: true });
      console.log(`User ${email} is now admin`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error making user admin:', error);
    return false;
  }
};

// Create user profile in Firestore for existing Auth users
export const createUserProfileFromAuth = async (email: string): Promise<boolean> => {
  try {
    // Check if user already exists in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log('User already exists in Firestore');
      return true;
    }

    // Get current auth user
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.email !== email) {
      console.log('No matching auth user found');
      return false;
    }

    // Create user profile in Firestore
    const isAdminEmail = email === 'orel895@gmail.com';
    const userProfile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'משתמש',
      phone: currentUser.phoneNumber || '',
      isAdmin: isAdminEmail,
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', currentUser.uid), userProfile);
    console.log(`User profile created for ${email}`);
    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return false;
  }
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
  try {
    const q = query(collection(db, 'appointments'));
    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as Appointment);
    });
    
    // Sort by date (most recent first)
    appointments.sort((a, b) => {
      if (a.date && b.date) {
        // Handle both Timestamp objects and regular Date objects
        const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
        return bTime - aTime;
      }
      return 0;
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting all appointments:', error);
    throw error;
  }
};

// Gallery functions
export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const q = query(collection(db, 'gallery'));
    const querySnapshot = await getDocs(q);
    const images: GalleryImage[] = [];
    
    querySnapshot.forEach((doc) => {
      images.push({
        id: doc.id,
        ...doc.data()
      } as GalleryImage);
    });
    
    return images.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error getting gallery images:', error);
    return [];
  }
};

export const addGalleryImage = async (imageData: Omit<GalleryImage, 'id' | 'createdAt'>) => {
  try {
    const newImage = {
      ...imageData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'gallery'), newImage);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const deleteGalleryImage = async (imageId: string) => {
  try {
    await deleteDoc(doc(db, 'gallery', imageId));
  } catch (error) {
    throw error;
  }
};

// Treatment management functions
export const addTreatment = async (treatmentData: Omit<Treatment, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'treatments'), treatmentData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateTreatment = async (treatmentId: string, updates: Partial<Treatment>) => {
  try {
    const docRef = doc(db, 'treatments', treatmentId);
    await updateDoc(docRef, updates);
  } catch (error) {
    throw error;
  }
};

export const deleteTreatment = async (treatmentId: string) => {
  try {
    await deleteDoc(doc(db, 'treatments', treatmentId));
  } catch (error) {
    throw error;
  }
};

// Barber management functions
export const addBarberProfile = async (barberData: Omit<Barber, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'barbers'), barberData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateBarberProfile = async (barberId: string, updates: Partial<Barber>) => {
  try {
    const docRef = doc(db, 'barbers', barberId);
    await updateDoc(docRef, updates);
  } catch (error) {
    throw error;
  }
};

export const deleteBarberProfile = async (barberId: string) => {
  try {
    await deleteDoc(doc(db, 'barbers', barberId));
  } catch (error) {
    throw error;
  }
};

// Firebase Storage helper functions
export const getStorageImages = async (folderPath: string): Promise<string[]> => {
  try {
    const imagesRef = ref(storage, folderPath);
    const result = await listAll(imagesRef);
    
    const urls = await Promise.all(
      result.items.map(async (imageRef) => {
        return await getDownloadURL(imageRef);
      })
    );
    
    return urls;
  } catch (error) {
    console.error(`Error getting images from ${folderPath}:`, error);
    return [];
  }
};

export const getImageUrl = async (imagePath: string): Promise<string | null> => {
  try {
    const imageRef = ref(storage, imagePath);
    const url = await getDownloadURL(imageRef);
    return url;
  } catch (error) {
    console.error(`Error getting image from ${imagePath}:`, error);
    return null;
  }
};

export const getAllStorageImages = async () => {
  try {
    const [galleryImages, backgroundImages, splashImages, workersImages, aboutusImages] = await Promise.all([
      getStorageImages('gallery'),
      getStorageImages('backgrounds'), 
      getStorageImages('splash'),
      getStorageImages('workers'),
      getStorageImages('aboutus')
    ]);
    
    return {
      gallery: galleryImages,
      backgrounds: backgroundImages,
      splash: splashImages,
      workers: workersImages,
      aboutus: aboutusImages
    };
  } catch (error) {
    console.error('Error getting all storage images:', error);
    return {
      gallery: [],
      backgrounds: [],
      splash: [],
      workers: [],
      aboutus: []
    };
  }
};

// Upload image to Firebase Storage
export const uploadImageToStorage = async (
  imageUri: string, 
  folderPath: string, 
  fileName: string
): Promise<string> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const imageRef = ref(storage, `${folderPath}/${fileName}`);
    await uploadBytes(imageRef, blob);
    
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Initialize empty collections (run once)
export const initializeCollections = async () => {
  try {
    // Create gallery collection with sample data
    await addDoc(collection(db, 'gallery'), {
      imageUrl: 'https://via.placeholder.com/300x200',
      type: 'gallery',
      order: 0,
      isActive: true,
      createdAt: Timestamp.now()
    });
    
    // Create availability collection sample
    await addDoc(collection(db, 'availability'), {
      barberId: 'sample-barber-id',
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '18:00',
      isAvailable: true,
      createdAt: Timestamp.now()
    });
    
    // Create settings collection sample
    await addDoc(collection(db, 'settings'), {
      key: 'business_hours',
      value: { start: '09:00', end: '18:00' },
      updatedAt: Timestamp.now()
    });
    
    console.log('Collections initialized successfully');
  } catch (error) {
    console.error('Error initializing collections:', error);
    throw error;
  }
};


// Barber availability functions
export const getBarberAvailability = async (barberId: string): Promise<BarberAvailability[]> => {
  try {
    const q = query(
      collection(db, 'availability'),
      where('barberId', '==', barberId)
    );
    const querySnapshot = await getDocs(q);
    const availability: BarberAvailability[] = [];
    
    querySnapshot.forEach((doc) => {
      availability.push({
        id: doc.id,
        ...doc.data()
      } as BarberAvailability);
    });
    
    return availability.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  } catch (error) {
    console.error('Error getting barber availability:', error);
    return [];
  }
};

export const getAllAvailability = async (): Promise<BarberAvailability[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'availability'));
    const availability: BarberAvailability[] = [];
    
    querySnapshot.forEach((doc) => {
      availability.push({
        id: doc.id,
        ...doc.data()
      } as BarberAvailability);
    });
    
    return availability;
  } catch (error) {
    console.error('Error getting all availability:', error);
    return [];
  }
};

export const addAvailability = async (availabilityData: Omit<BarberAvailability, 'id' | 'createdAt'>) => {
  try {
    const newAvailability = {
      ...availabilityData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'availability'), newAvailability);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateAvailability = async (availabilityId: string, updates: Partial<BarberAvailability>) => {
  try {
    const docRef = doc(db, 'availability', availabilityId);
    await updateDoc(docRef, updates);
  } catch (error) {
    throw error;
  }
};

export const deleteAvailability = async (availabilityId: string) => {
  try {
    await deleteDoc(doc(db, 'availability', availabilityId));
  } catch (error) {
    throw error;
  }
};

// Batch update availability for a barber
export const updateBarberWeeklyAvailability = async (barberId: string, weeklySchedule: Omit<BarberAvailability, 'id' | 'barberId' | 'createdAt'>[]) => {
  try {
    // Delete existing availability for this barber
    const existingAvailability = await getBarberAvailability(barberId);
    await Promise.all(
      existingAvailability.map(availability => 
        deleteAvailability(availability.id)
      )
    );
    
    // Add new availability
    await Promise.all(
      weeklySchedule.map(schedule => 
        addAvailability({
          ...schedule,
          barberId
        })
      )
    );
  } catch (error) {
    throw error;
  }
};

// Migrate old barber data to new format
export const migrateBarberData = async (barberId: string, barberData: any) => {
  try {
    const standardizedData: Partial<Barber> = {
      name: barberData.name || '',
      experience: barberData.experience || barberData.bio || '',
      rating: barberData.rating || 5,
      specialties: barberData.specialties || [],
      image: barberData.image || barberData.photoUrl || '',
      available: barberData.available !== false,
      phone: barberData.phone || ''
    };

    await updateBarberProfile(barberId, standardizedData);
    return standardizedData;
  } catch (error) {
    console.error('Error migrating barber data:', error);
    throw error;
  }
};

// Add a new barber with availability
export const addBarber = async ({ name, image, availableSlots, availabilityWindow }: {
  name: string;
  image: string;
  availableSlots: string[];
  availabilityWindow: { start: string; end: string };
}) => {
  try {
    const barber = {
      name,
      image,
      specialties: [],
      experience: '',
      rating: 5,
      available: true,
      availableSlots,
      availabilityWindow,
    };
    const docRef = await addDoc(collection(db, 'barbers'), barber);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Initialize default availability for a barber if none exists
export const initializeBarberAvailability = async (barberId: string): Promise<void> => {
  try {
    const existing = await getBarberAvailability(barberId);
    if (existing.length > 0) {
      return; // Already has availability
    }
    
    // Create default availability (Monday-Thursday 9:00-18:00)
    const defaultSchedule = [
      { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', isAvailable: false }, // Sunday
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Monday
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Tuesday
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Wednesday
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Thursday
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isAvailable: false }, // Friday
      { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isAvailable: false }, // Saturday
    ];
    
    await updateBarberWeeklyAvailability(barberId, defaultSchedule);
    console.log(`Initialized default availability for barber ${barberId}`);
  } catch (error) {
    console.error('Error initializing barber availability:', error);
  }
};

// Get barber appointments for a specific day - helper function for BookingScreen
export const getBarberAppointmentsForDay = async (barberId: string, date: Date): Promise<any[]> => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('Querying appointments for barber:', barberId);
    console.log('Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
    
    // Simplified query to avoid Firebase index issues
    const q = query(
      collection(db, 'appointments'),
      where('barberId', '==', barberId)
    );
    
    const snapshot = await getDocs(q);
    const allAppointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter in JavaScript instead of Firestore
    const filteredAppointments = allAppointments.filter((appointment: any) => {
      // Only consider confirmed/pending appointments
      if (!['confirmed', 'pending'].includes(appointment.status)) {
        return false;
      }
      
      // Check if appointment is on the selected date
      let appointmentDate;
      if (appointment.date && typeof appointment.date.toDate === 'function') {
        appointmentDate = appointment.date.toDate();
      } else if (appointment.date) {
        appointmentDate = new Date(appointment.date);
      } else {
        return false;
      }
      
      return appointmentDate >= startOfDay && appointmentDate <= endOfDay;
    });
    
    console.log('Found appointments:', filteredAppointments.length);
    console.log('Appointment details:', filteredAppointments);
    return filteredAppointments;
  } catch (error) {
    console.error('Error getting barber appointments for day:', error);
    return [];
  }
};