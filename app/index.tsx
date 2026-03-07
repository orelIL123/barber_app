import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { authManager } from '../services/authManager';
import { CacheUtils } from '../services/cache';
import { getBarbers, getTreatments } from '../services/firebase';

// Keep splash visible until HomeScreen background image loads
SplashScreen.preventAutoHideAsync();

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
          const gallerySnapshot = await getDocs(collection(db, 'gallery'));
          const galleryImages: string[] = [];
          
          gallerySnapshot.forEach((doc) => {
            const data = doc.data();
            const isActive = data.isActive !== false;
            if (isActive && data.type === 'gallery' && data.imageUrl) {
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
          
          // Pick active background/aboutus from gallery first (matches admin "active images")
          const activeBackgroundImages = gallerySnapshot.docs
            .map((doc) => doc.data())
            .filter((data) => data.isActive !== false && data.type === 'background' && data.imageUrl);
          const activeAboutUsImages = gallerySnapshot.docs
            .map((doc) => doc.data())
            .filter((data) => data.isActive !== false && data.type === 'aboutus' && data.imageUrl);

          const pickTopImage = (items: any[]) =>
            items
              .sort((a, b) => (b.order || 0) - (a.order || 0))
              .map((item) => item.imageUrl)[0] || '';

          let atmosphereImage = pickTopImage(activeBackgroundImages);
          let aboutUsImage = pickTopImage(activeAboutUsImages);

          // Fallback to settings document if no active image in gallery
          let settingsAtmosphereImage = '';
          let settingsAboutUsImage = '';
          
          const settingsDocRef = doc(db, 'settings', 'images');
          const settingsDocSnap = await getDoc(settingsDocRef);
          if (settingsDocSnap.exists()) {
            const settingsData = settingsDocSnap.data();
            settingsAtmosphereImage = settingsData.atmosphereImage || '';
            settingsAboutUsImage = settingsData.aboutUsImage || '';
          }
          
          if (!atmosphereImage) atmosphereImage = settingsAtmosphereImage;
          if (!aboutUsImage) aboutUsImage = settingsAboutUsImage;
          
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
          const defaultSubtitle = 'איך אוכל לעזור לך היום? ✂️';
          const welcomeDoc = await getDoc(doc(db, 'settings', 'homeMessages'));
          let welcomeMessage = 'שלום, ברוכים הבאים';
          let subtitleMessage = defaultSubtitle;
          
          if (welcomeDoc.exists()) {
            const data = welcomeDoc.data();
            welcomeMessage = data.welcome || welcomeMessage;
            subtitleMessage = data.subtitle || defaultSubtitle;
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
            subtitleMessage: 'איך אוכל לעזור לך היום? ✂️',
            aboutUsMessage: 'ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.',
            popupMessage: undefined,
            showPopup: false,
          };
        }
      })(),
    ]);

    const hasUsableHomeImages =
      !!imagesData.atmosphere || !!imagesData.aboutUs || imagesData.gallery.length > 0;

    // Prefetch home images so they are in the native image cache when HomeScreen mounts.
    // We await the atmosphere (background) image so it is guaranteed ready before navigation.
    // Gallery images are prefetched in parallel but we don't block on them.
    if (hasUsableHomeImages) {
      const criticalUrls = [imagesData.atmosphere, imagesData.aboutUs]
        .filter((url): url is string => typeof url === 'string' && url.startsWith('http'));
      const galleryUrls = imagesData.gallery
        .slice(0, 6)
        .filter((url): url is string => typeof url === 'string' && url.startsWith('http'));

      // Prefetch all images in background — do NOT block navigation on this
      Promise.all([
        ...criticalUrls.map((url) => Image.prefetch(url).catch(() => false)),
        ...galleryUrls.map((url) => Image.prefetch(url).catch(() => false)),
      ]).catch(() => false);
    }

    // Save to cache (don't overwrite existing image cache with an empty payload).
    await Promise.all([
      hasUsableHomeImages ? CacheUtils.setHomeImages(imagesData, 30) : Promise.resolve(),
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

// Preload barbers + treatments and warm remote image cache during splash
const preloadBookingData = async (): Promise<void> => {
  try {
    console.log('🔄 Preloading booking data (barbers + treatments)...');

    const [barbers, treatments] = await Promise.all([
      getBarbers(false),
      getTreatments(true),
    ]);

    // Store in cache so non-realtime screens can render faster.
    await Promise.all([
      CacheUtils.setBarbers(barbers, 30),
      CacheUtils.setTreatments(treatments, 60),
    ]);

    const barberImageUrls = barbers
      .map((b: any) => b.image || b.photoUrl || '')
      .filter((url: string) => typeof url === 'string' && /^https?:\/\//.test(url));

    const treatmentImageUrls = treatments
      .map((t: any) => t.image || '')
      .filter((url: string) => typeof url === 'string' && /^https?:\/\//.test(url));

    const uniqueUrls = Array.from(new Set([...barberImageUrls, ...treatmentImageUrls]));

    await Promise.all(
      uniqueUrls.map((url) =>
        Image.prefetch(url).catch(() => false)
      )
    );

    console.log('✅ Booking data preloaded:', {
      barbers: barbers.length,
      treatments: treatments.length,
      prefetchedImages: uniqueUrls.length,
    });
  } catch (error) {
    console.warn('Failed to preload booking data:', error);
  }
};

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Wait for Firebase auth, but cap at 3 seconds to avoid long splash
        await Promise.race([
          authManager.waitForInitialization(),
          new Promise<void>(r => setTimeout(r, 3000)),
        ]);

        // Fire preload in background — do NOT await before navigating
        preloadHomeData();
        preloadBookingData();

        const isAuthenticated = await authManager.isAuthenticated();
        if (isAuthenticated) {
          router.replace('/(tabs)');
          return;
        }

        const autoLoginSuccess = await authManager.attemptAutoLogin();
        router.replace(autoLoginSuccess ? '/(tabs)' : '/auth-choice');
      } catch (error) {
        console.error('Error in auth check:', error);
        router.replace('/auth-choice');
      }
    };

    checkAuthState();
  }, [router]);

  // Show custom splash - native splash will stay visible until HomeScreen image loads
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
