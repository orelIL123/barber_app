import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth } from '../firebase/config'; // Now using JS SDK instance
import { User as FirebaseAuthUser, onAuthStateChanged } from 'firebase/auth'; // Import JS SDK types/functions
import { getUserData, signOutUser } from '../firebase/services'; // Using updated services
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the imported User type if available, otherwise placeholder
import { User as UserProfile } from '../types/user'; // Attempt to import User as UserProfile

interface AuthContextType {
  user: FirebaseAuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  setUserProfile: (profile: UserProfile | null) => void; 
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true, // Start as true, will be set to false after listener runs
  setUserProfile: () => {},
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfileInternal] = useState<UserProfile | null>(null); // Renamed to avoid conflict
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isMounted = useRef(true);

  // Function passed to context consumers to update profile
  const setUserProfile = (profile: UserProfile | null) => {
      if (isMounted.current) {
          setUserProfileInternal(profile);
      }
  };

  const resetAuthState = () => {
    if (isMounted.current) {
      setUser(null);
      setUserProfileInternal(null); // Use internal setter
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process (JS SDK)');
      setIsSigningOut(true);
      await AsyncStorage.removeItem('user_auth'); // Keep AsyncStorage removal if used elsewhere
      await signOutUser(); // Use updated service function
      resetAuthState();
      setTimeout(() => {
          if (isMounted.current) setIsSigningOut(false);
      }, 500); 
    } catch (error) {
      console.error('Error signing out:', error);
      if (isMounted.current) setIsSigningOut(false);
      throw error;
    }
  };

  useEffect(() => {
    isMounted.current = true;
    setLoading(true); // Set loading true initially

    // Subscribe to auth state changes using JS SDK
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!isMounted.current) return;

      if (authUser) {
        setUser(authUser);
        try {
          const profile = await getUserData(authUser.uid);
          if (isMounted.current && profile) {
            setUserProfileInternal(profile as UserProfile); // Use internal setter
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
          if (isMounted.current) setUserProfileInternal(null);
        } finally {
          if (isMounted.current) setLoading(false); 
        }
      } else if (!isSigningOut) {
        resetAuthState();
        if (isMounted.current) setLoading(false); 
      }
      else if (isSigningOut && isMounted.current) {
         // Keep loading true or handle as needed during sign out
      }
    });

    // Cleanup function
    return () => {
      isMounted.current = false;
      unsubscribe(); // Unsubscribe from the listener
    };
  }, [isSigningOut]); 

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, setUserProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 