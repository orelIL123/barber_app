import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
    signInWithPhoneNumber,
    PhoneAuthProvider,
    signInWithCredential,
    RecaptchaVerifier
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
import { getDownloadURL, listAll, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email?: string; // Make email optional for phone auth
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

// Phone authentication functions
export const sendSMSVerification = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

export const verifySMSCode = async (confirmationResult: any, verificationCode: string) => {
  try {
    const result = await confirmationResult.confirm(verificationCode);
    return result.user;
  } catch (error) {
    console.error('Error verifying SMS code:', error);
    throw error;
  }
};

export const registerUserWithPhone = async (phoneNumber: string, displayName: string, verificationId: string, verificationCode: string) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    
    await updateProfile(user, {
      displayName: displayName
    });
    
    // Check if this is the admin phone number (replace with your admin phone)
    const isAdminPhone = phoneNumber === '+972523456789'; // Replace with actual admin phone
    
    const userProfile: UserProfile = {
      uid: user.uid,
      displayName: displayName,
      phone: phoneNumber,
      isAdmin: isAdminPhone,
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    return user;
  } catch (error) {
    console.error('Error registering user with phone:', error);
    throw error;
  }
};

export const loginWithPhone = async (phoneNumber: string, verificationId: string, verificationCode: string) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (error) {
    console.error('Error logging in with phone:', error);
    throw error;
  }
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

// Check what's in Firebase Storage
export const listAllStorageImages = async () => {
  try {
    console.log('📂 Checking Firebase Storage contents...');
    
    const storageImages = await getAllStorageImages();
    
    console.log('🗂️ Firebase Storage contents:');
    console.log('Gallery folder:', storageImages.gallery);
    console.log('Backgrounds folder:', storageImages.backgrounds);
    console.log('Splash folder:', storageImages.splash);
    console.log('Workers folder:', storageImages.workers);
    console.log('About us folder:', storageImages.aboutus);
    
    return storageImages;
  } catch (error) {
    console.error('❌ Error listing storage images:', error);
    throw error;
  }
};

// Restore gallery from Firebase Storage images
export const restoreGalleryFromStorage = async () => {
  try {
    console.log('🔄 Restoring gallery from Firebase Storage...');
    
    // Get images from Firebase Storage
    const storageImages = await getAllStorageImages();
    
    // Clear existing gallery
    const existingImages = await getGalleryImages();
    for (const image of existingImages) {
      console.log('🗑️ Deleting existing image:', image.id);
      await deleteGalleryImage(image.id);
    }
    
    // Add images from storage to gallery collection
    let addedCount = 0;
    
    // Add gallery images
    for (let i = 0; i < storageImages.gallery.length; i++) {
      const imageUrl = storageImages.gallery[i];
      await addGalleryImage({
        imageUrl,
        type: 'gallery',
        order: i,
        isActive: true
      });
      console.log('➕ Added gallery image:', imageUrl);
      addedCount++;
    }
    
    // Add background images
    for (let i = 0; i < storageImages.backgrounds.length; i++) {
      const imageUrl = storageImages.backgrounds[i];
      await addGalleryImage({
        imageUrl,
        type: 'background',
        order: i,
        isActive: true
      });
      console.log('➕ Added background image:', imageUrl);
      addedCount++;
    }
    
    // Add about us images
    for (let i = 0; i < storageImages.aboutus.length; i++) {
      const imageUrl = storageImages.aboutus[i];
      await addGalleryImage({
        imageUrl,
        type: 'gallery',
        order: storageImages.gallery.length + storageImages.backgrounds.length + i,
        isActive: true
      });
      console.log('➕ Added about us image:', imageUrl);
      addedCount++;
    }
    
    console.log('✅ Gallery restored with', addedCount, 'images from Firebase Storage');
    return addedCount;
  } catch (error) {
    console.error('❌ Error restoring gallery from storage:', error);
    throw error;
  }
};

// Clear all gallery images and add fresh ones
export const resetGalleryWithRealImages = async () => {
  try {
    console.log('🧹 Clearing all gallery images and adding fresh ones...');
    
    // Get all existing gallery images
    const existingImages = await getGalleryImages();
    console.log('Found', existingImages.length, 'existing images to delete');
    
    // Delete ALL existing gallery images
    for (const image of existingImages) {
      console.log('🗑️ Deleting image:', image.id);
      await deleteGalleryImage(image.id);
    }
    
    // Add fresh real images
    const realGalleryImages = [
      {
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 0,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 1,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 2,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 3,
        isActive: true
      }
    ];

    for (const imageData of realGalleryImages) {
      console.log('➕ Adding fresh image:', imageData.imageUrl);
      await addGalleryImage(imageData);
    }
    
    console.log('✅ Gallery reset with', realGalleryImages.length, 'fresh real images');
    return realGalleryImages.length;
  } catch (error) {
    console.error('❌ Error resetting gallery:', error);
    throw error;
  }
};

// Replace existing placeholder images with real images
export const replaceGalleryPlaceholders = async () => {
  try {
    console.log('🔄 Replacing placeholder images with real images...');
    
    // Get all existing gallery images
    const existingImages = await getGalleryImages();
    console.log('Found', existingImages.length, 'existing images');
    
    // Debug: show what we have
    existingImages.forEach((img, index) => {
      console.log(`Image ${index}:`, {
        id: img.id,
        imageUrl: img.imageUrl || 'MISSING URL',
        type: img.type,
        isActive: img.isActive
      });
    });
    
    // Delete old placeholder images
    for (const image of existingImages) {
      if (image.imageUrl && (image.imageUrl.includes('placeholder') || image.imageUrl.includes('via.placeholder'))) {
        console.log('🗑️ Deleting placeholder image:', image.id);
        await deleteGalleryImage(image.id);
      } else if (!image.imageUrl) {
        console.log('🗑️ Deleting image with missing URL:', image.id);
        await deleteGalleryImage(image.id);
      }
    }
    
    // Add new real images
    const realGalleryImages = [
      {
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 0,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 1,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 2,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 3,
        isActive: true
      }
    ];

    for (const imageData of realGalleryImages) {
      console.log('➕ Adding real image:', imageData.imageUrl);
      await addGalleryImage(imageData);
    }
    
    console.log('✅ Gallery updated with', realGalleryImages.length, 'real images');
    return realGalleryImages.length;
  } catch (error) {
    console.error('❌ Error replacing gallery placeholders:', error);
    throw error;
  }
};

// Initialize gallery with default images
export const initializeGalleryImages = async () => {
  try {
    // Check if gallery already has images
    const existingImages = await getGalleryImages();
    
    // If we have placeholder images, replace them
    const hasPlaceholders = existingImages.some(img => 
      img.imageUrl && (img.imageUrl.includes('placeholder') || img.imageUrl.includes('via.placeholder'))
    );
    
    if (hasPlaceholders) {
      console.log('🔄 Found placeholder images, replacing with real images...');
      await replaceGalleryPlaceholders();
      return;
    }
    
    if (existingImages.length > 0) {
      console.log('Gallery already has real images, skipping initialization');
      return;
    }

    console.log('Initializing gallery with default images...');
    
    // Add some real gallery images
    const defaultGalleryImages = [
      {
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 0,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 1,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 2,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 3,
        isActive: true
      }
    ];

    for (const imageData of defaultGalleryImages) {
      await addGalleryImage(imageData);
    }
    
    console.log('Gallery initialized with', defaultGalleryImages.length, 'images');
  } catch (error) {
    console.error('Error initializing gallery images:', error);
    throw error;
  }
};

// Initialize empty collections (run once)
export const initializeCollections = async () => {
  try {
    // Initialize gallery images
    await initializeGalleryImages();
    
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

// Image Management Functions for Admin Panel

export interface AppImages {
  atmosphereImage?: string;
  aboutUsImage?: string;
  galleryImages?: string[];
}

// Get current app images from Firestore
export const getAppImages = async (): Promise<AppImages> => {
  try {
    const docRef = doc(db, 'settings', 'images');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        atmosphereImage: data.atmosphereImage || '',
        aboutUsImage: data.aboutUsImage || '',
        galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : []
      };
    }
    
    return {
      atmosphereImage: '',
      aboutUsImage: '',
      galleryImages: []
    };
  } catch (error) {
    console.error('Error getting app images:', error);
    throw error;
  }
};

// Upload image to Firebase Storage for app images
export const uploadAppImageToStorage = async (
  imageUri: string, 
  imagePath: string, 
  fileName: string
): Promise<string> => {
  try {
    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Create storage reference
    const imageRef = ref(storage, `${imagePath}/${fileName}`);
    
    // Upload image
    await uploadBytes(imageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(imageRef);
    
    console.log('Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Delete image from Firebase Storage (used when replacing)
export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  try {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
      return; // Skip if not a Firebase Storage URL
    }
    
    // Extract storage path from URL
    const pathStart = imageUrl.indexOf('/o/') + 3;
    const pathEnd = imageUrl.indexOf('?');
    const path = decodeURIComponent(imageUrl.slice(pathStart, pathEnd));
    
    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
    
    console.log('Image deleted successfully:', path);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error - deletion failure shouldn't prevent upload
  }
};

// Update atmosphere/background image
export const updateAtmosphereImage = async (imageUri: string): Promise<string> => {
  try {
    const fileName = `atmosphere_${Date.now()}.jpg`;
    
    // Get current image URL to delete old one
    const currentImages = await getAppImages();
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(imageUri, 'app-images', fileName);
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      atmosphereImage: newImageUrl
    }, { merge: true });
    
    // Delete old image after successful update
    if (currentImages.atmosphereImage) {
      await deleteImageFromStorage(currentImages.atmosphereImage);
    }
    
    console.log('Atmosphere image updated successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error updating atmosphere image:', error);
    throw error;
  }
};

// Update about us image
export const updateAboutUsImage = async (imageUri: string): Promise<string> => {
  try {
    const fileName = `about_us_${Date.now()}.jpg`;
    
    // Get current image URL to delete old one
    const currentImages = await getAppImages();
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(imageUri, 'app-images', fileName);
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      aboutUsImage: newImageUrl
    }, { merge: true });
    
    // Delete old image after successful update
    if (currentImages.aboutUsImage) {
      await deleteImageFromStorage(currentImages.aboutUsImage);
    }
    
    console.log('About us image updated successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error updating about us image:', error);
    throw error;
  }
};

// Add image to app gallery (different from gallery collection)
export const addAppGalleryImage = async (imageUri: string): Promise<string> => {
  try {
    const fileName = `gallery_${Date.now()}.jpg`;
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(imageUri, 'app-images/gallery', fileName);
    
    // Get current images
    const currentImages = await getAppImages();
    const updatedGallery = [...(currentImages.galleryImages || []), newImageUrl];
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      galleryImages: updatedGallery
    }, { merge: true });
    
    console.log('App gallery image added successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error adding app gallery image:', error);
    throw error;
  }
};

// Remove image from app gallery
export const removeAppGalleryImage = async (imageUrl: string): Promise<void> => {
  try {
    // Get current images
    const currentImages = await getAppImages();
    const updatedGallery = (currentImages.galleryImages || []).filter(url => url !== imageUrl);
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      galleryImages: updatedGallery
    }, { merge: true });
    
    // Delete from storage
    await deleteImageFromStorage(imageUrl);
    
    console.log('App gallery image removed successfully');
  } catch (error) {
    console.error('Error removing app gallery image:', error);
    throw error;
  }
};

// Replace app gallery image (remove old, add new)
export const replaceAppGalleryImage = async (oldImageUrl: string, newImageUri: string): Promise<string> => {
  try {
    const fileName = `gallery_${Date.now()}.jpg`;
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(newImageUri, 'app-images/gallery', fileName);
    
    // Get current images
    const currentImages = await getAppImages();
    const updatedGallery = (currentImages.galleryImages || []).map(url => 
      url === oldImageUrl ? newImageUrl : url
    );
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      galleryImages: updatedGallery
    }, { merge: true });
    
    // Delete old image
    await deleteImageFromStorage(oldImageUrl);
    
    console.log('App gallery image replaced successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error replacing app gallery image:', error);
    throw error;
  }
};