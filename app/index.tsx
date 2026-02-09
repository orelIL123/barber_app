import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { authManager } from '../services/authManager';
import { CacheUtils } from '../services/cache';

// Preload home screen data (images and content)
const preloadHomeData = async (): Promise<void> => {
  try {
    console.log('🔄 Preloading home screen data...');
    const db = getFirestore();

    // Load images and content in parallel
    const [imagesData, contentData] = await Promise.all([
      // Load images
      (async () => {
        try {
          // Load gallery images
          const galleryQuery = query(collection(db, 'gallery'), where('isActive', '==', true));
          const gallerySnapshot = await getDocs(galleryQuery);
          const galleryImages: string[] = [];
          
          gallerySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.type === 'gallery' && data.imageUrl) {
              galleryImages.push(data.imageUrl);
            }
          });
          
          // Sort by order if available
          galleryImages.sort((a, b) => {
            const docA = gallerySnapshot.docs.find(doc => doc.data().imageUrl === a);
            const docB = gallerySnapshot.docs.find(doc => doc.data().imageUrl === b);
            const orderA = docA?.data().order || 0;
            const orderB = docB?.data().order || 0;
            return orderA - orderB;
          });
          
          // Load atmosphere and about us images from settings
          let atmosphereImage = '';
          let aboutUsImage = '';
          
          const settingsDocRef = doc(db, 'settings', 'images');
          const settingsDocSnap = await getDoc(settingsDocRef);
          if (settingsDocSnap.exists()) {
            const settingsData = settingsDocSnap.data();
            atmosphereImage = settingsData.atmosphereImage || '';
            aboutUsImage = settingsData.aboutUsImage || '';
          }
          
          // Also check gallery collection for background/aboutus images
          if (!atmosphereImage || !aboutUsImage) {
            gallerySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.type === 'background' && data.imageUrl && !atmosphereImage) {
                atmosphereImage = data.imageUrl;
              }
              if (data.type === 'aboutus' && data.imageUrl && !aboutUsImage) {
                aboutUsImage = data.imageUrl;
              }
            });
          }
          
          return {
            atmosphere: atmosphereImage,
            aboutUs: aboutUsImage,
            gallery: galleryImages,
          };
        } catch (error) {
          console.warn('Failed to preload images:', error);
          return {
            atmosphere: '',
            aboutUs: '',
            gallery: [],
          };
        }
      })(),
      
      // Load content
      (async () => {
        try {
          const defaultAboutUs = 'ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.';
          
          // Load welcome messages
          const welcomeDoc = await getDoc(doc(db, 'settings', 'homeMessages'));
          let welcomeMessage = 'שלום, ברוכים הבאים';
          let subtitleMessage = 'ל-TURGI ברברשופ';
          
          if (welcomeDoc.exists()) {
            const data = welcomeDoc.data();
            welcomeMessage = data.welcome || welcomeMessage;
            subtitleMessage = data.subtitle || subtitleMessage;
          }
          
          // Load about us text
          const aboutDoc = await getDoc(doc(db, 'settings', 'aboutUsText'));
          let aboutUsMessage = defaultAboutUs;
          if (aboutDoc.exists()) {
            const data = aboutDoc.data();
            aboutUsMessage = data.text || defaultAboutUs;
          }
          
          // Check for popup message
          const popupDoc = await getDoc(doc(db, 'settings', 'popupMessage'));
          let popupMessage: string | undefined;
          let showPopup = false;
          
          if (popupDoc.exists()) {
            const data = popupDoc.data();
            if (data.isActive && data.message && data.expiresAt && data.expiresAt.toDate() > new Date()) {
              popupMessage = data.message;
              showPopup = true;
            }
          }
          
          return {
            welcomeMessage,
            subtitleMessage,
            aboutUsMessage,
            popupMessage,
            showPopup,
          };
        } catch (error) {
          console.warn('Failed to preload content:', error);
          return {
            welcomeMessage: 'שלום, ברוכים הבאים',
            subtitleMessage: 'ל-TURGI ברברשופ',
            aboutUsMessage: 'ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.',
            popupMessage: undefined,
            showPopup: false,
          };
        }
      })(),
    ]);

    // Save to cache
    await Promise.all([
      CacheUtils.setHomeImages(imagesData, 30),
      CacheUtils.setHomeContent(contentData, 30),
    ]);

    console.log('✅ Home screen data preloaded successfully:', {
      galleryCount: imagesData.gallery.length,
      hasAtmosphere: !!imagesData.atmosphere,
      hasAboutUs: !!imagesData.aboutUs,
      hasPopup: contentData.showPopup,
    });
  } catch (error) {
    console.error('❌ Error preloading home data:', error);
    // Don't throw - let HomeScreen handle fallback loading
  }
};

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let authStateChecked = false;
    const SPLASH_MIN_MS = 5000; // 5 seconds minimum so everything has time to load

    const checkAuthState = async (): Promise<'/(tabs)' | '/auth-choice'> => {
      try {
        await authManager.waitForInitialization();
        if (authStateChecked) return '/(tabs)';
        authStateChecked = true;

        await preloadHomeData();

        const isAuthenticated = await authManager.isAuthenticated();
        if (isAuthenticated) return '/(tabs)';

        const autoLoginSuccess = await authManager.attemptAutoLogin();
        return autoLoginSuccess ? '/(tabs)' : '/auth-choice';
      } catch (error) {
        console.error('Error in auth check:', error);
        return '/auth-choice';
      }
    };

    Promise.all([
      checkAuthState(),
      new Promise<void>(r => setTimeout(r, SPLASH_MIN_MS)),
    ]).then(([route]) => router.replace(route as string));
  }, [router]);

  // Show splash until loaded (minimum 5 seconds)
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/TURGI.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
}); 