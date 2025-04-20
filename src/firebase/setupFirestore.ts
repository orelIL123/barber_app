/*
// Commenting out the entire file as it's Firebase-specific setup
import { getFirestore, collection, getDocs, addDoc } from '@react-native-firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { initialStaffData, initialServiceData } from './initialData'; // Assuming initialData is defined elsewhere
import { Service } from '../types/service'; // Assuming Service type is defined

const setupFirestore = async () => {
  const firestore = getFirestore();
  const auth = getAuth();

  // Setup Staff (Users with role 'staff')
  const staffCollectionRef = collection(firestore, 'users');
  const staffSnapshot = await getDocs(staffCollectionRef); // Consider filtering by role if needed

  if (staffSnapshot.empty) {
    console.log('Staff collection is empty. Setting up initial staff...');
    for (const staff of initialStaffData) {
      try {
        // 1. Create Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, staff.email, staff.password);
        const user = userCredential.user;
        console.log(`Auth user created for ${staff.email} with UID: ${user.uid}`);

        // 2. Add user data to Firestore
        await addDoc(staffCollectionRef, {
          uid: user.uid, // Link to Auth UID
          email: staff.email,
          displayName: staff.displayName,
          role: 'staff',
          staffDetails: {
              specialty: staff.staffDetails.specialty
          },
          // Add any other relevant fields from your User interface
          createdAt: serverTimestamp() // Use serverTimestamp from Firestore
        });
        console.log(`Firestore document created for ${staff.displayName}`);

      } catch (error) {
        console.error(`Error setting up staff ${staff.displayName}:`, error);
        // Handle specific errors, e.g., email-already-in-use
        if (error.code === 'auth/email-already-in-use') {
          console.log(`Email ${staff.email} already exists.`);
        } else {
          // Handle other errors
        }
      }
    }
  } else {
    console.log('Staff collection already exists.');
  }

  // Setup Services
  const servicesCollectionRef = collection(firestore, 'services');
  const servicesSnapshot = await getDocs(servicesCollectionRef);

  if (servicesSnapshot.empty) {
    console.log('Services collection is empty. Setting up initial services...');
    initialServiceData.forEach(async (service: Service) => {
      try {
        await addDoc(servicesCollectionRef, service);
        console.log(`Service '${service.name}' added.`);
      } catch (error) {
        console.error(`Error adding service ${service.name}:`, error);
      }
    });
  } else {
    console.log('Services collection already exists.');
  }
};

// Need to import serverTimestamp from Firestore
import { serverTimestamp } from '@react-native-firebase/firestore';

export default setupFirestore;
*/ 