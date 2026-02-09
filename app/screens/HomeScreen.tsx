import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CacheUtils } from '../../services/cache';
import NotificationPanel from '../components/NotificationPanel';
import { ScissorsLoader } from '../components/ScissorsLoader';
import SideMenu from '../components/SideMenu';
import TermsModal from '../components/TermsModal';
import TopNav from '../components/TopNav';

const { height } = Dimensions.get('window');

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
  isGuestMode?: boolean;
}


// Simple NeonButton component
const NeonButton: React.FC<{
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: any;
}> = ({ title, onPress, variant = 'primary', style }) => {
  return (
    <TouchableOpacity
      style={[
        styles.neonButton,
        variant === 'primary' ? styles.neonButtonPrimary : styles.neonButtonSecondary,
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.neonButtonText,
        variant === 'primary' ? styles.neonButtonTextPrimary : styles.neonButtonTextSecondary,
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

function HomeScreen({ onNavigate, isGuestMode = false }: HomeScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | number>('');
  const [settingsImages, setSettingsImages] = useState<{
    atmosphere: string;
    aboutUs: string;
    gallery: string[];
  }>({
    atmosphere: '',
    aboutUs: '',
    gallery: [],
  });
  
  // Dynamic content states
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [subtitleMessage, setSubtitleMessage] = useState('');
  const [aboutUsMessage, setAboutUsMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;
  
  // 3D Carousel refs
  const carousel3DRef = useRef<ScrollView>(null);
  // Card sizing for 3D gallery carousel
  // Keep these values in sync with `styles.carousel3DCard` and `styles.carousel3DContainer`
  // so the infinite-scroll math and the visuals match.
  const cardWidth = 285; // Increased by 1.5x (was 190)
  const cardSpacing = 8;
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Get original images array
  // Fallback: real gallery images when Firebase/admin hasn't set any yet (JPG for Android AAPT compatibility)
  const originalImages = settingsImages.gallery.length > 0 ? settingsImages.gallery : [
    require('../../assets/images/gallery/1.jpg'),
    require('../../assets/images/gallery/2.jpg'),
    require('../../assets/images/gallery/3.jpg'),
    require('../../assets/images/gallery/4.jpg'),
    require('../../assets/images/gallery/5.jpg'),
  ];
  
  // Create infinite scroll data by duplicating images
  const infiniteImages = [...originalImages, ...originalImages, ...originalImages];
  const originalLength = originalImages.length;
  const itemWidth = cardWidth + cardSpacing;
  
  // Handle infinite scroll
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const totalWidth = originalLength * itemWidth;
    
    // If scrolled past the end, reset to beginning + offset
    if (offsetX >= totalWidth * 2) {
      carousel3DRef.current?.scrollTo({
        x: offsetX - totalWidth,
        animated: false,
      });
    }
    // If scrolled before the beginning, reset to end - offset
    else if (offsetX <= 0) {
      carousel3DRef.current?.scrollTo({
        x: offsetX + totalWidth,
        animated: false,
      });
    }
  };

  // Start at middle section for infinite scroll
  useEffect(() => {
    setTimeout(() => {
      carousel3DRef.current?.scrollTo({
        x: originalLength * itemWidth,
        animated: false,
      });
    }, 100);
  }, [originalLength, itemWidth]);

  // Reload home data whenever the screen gains focus (e.g. returning from admin)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadDataFromCache = async () => {
        try {
          setLoading(true);
          const [cachedImages, cachedContent] = await Promise.all([
            CacheUtils.getHomeImages(),
            CacheUtils.getHomeContent(),
          ]);

          if (cancelled) return;

          if (cachedImages && cachedContent) {
            console.log('✅ Loading home data from cache');
            setSettingsImages(cachedImages);
            setWelcomeMessage(cachedContent.welcomeMessage);
            setSubtitleMessage(cachedContent.subtitleMessage);
            setAboutUsMessage(cachedContent.aboutUsMessage);
            if (cachedContent.showPopup && cachedContent.popupMessage) {
              setPopupMessage(cachedContent.popupMessage);
              setShowPopup(true);
            }
          } else {
            console.log('⚠️ Cache miss - loading from Firebase');
            await Promise.all([
              fetchImages(),
              fetchDynamicContent(),
            ]);
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Error loading from cache:', error);
            await Promise.all([
              fetchImages(),
              fetchDynamicContent(),
            ]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      loadDataFromCache();
      cleanupOldWaitlistData();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      // Start animations immediately (don't wait for image load)
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(headerFade, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ctaFade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardsFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // Cleanup old waitlist entries (runs automatically on app start)
  const cleanupOldWaitlistData = async () => {
    try {
      const { cleanupOldWaitlistEntries } = await import('../../services/firebase');
      await cleanupOldWaitlistEntries();
      console.log('✅ Old waitlist entries cleaned up automatically');
    } catch (error) {
      console.error('❌ Error cleaning up old waitlist entries:', error);
    }
  };

  // Fetch dynamic content from Firebase
  const fetchDynamicContent = async () => {
    try {
      const db = getFirestore();
      
      // Load welcome messages
      const welcomeDoc = await getDoc(doc(db, 'settings', 'homeMessages'));
      let welcomeMessage = t('home.welcome');
      let subtitleMessage = t('home.subtitle');
      
      if (welcomeDoc.exists()) {
        const data = welcomeDoc.data();
        welcomeMessage = data.welcome || welcomeMessage;
        subtitleMessage = data.subtitle || subtitleMessage;
      }
      
      setWelcomeMessage(welcomeMessage);
      setSubtitleMessage(subtitleMessage);

      // Load about us text
      const defaultAboutUs = 'ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.';
      const aboutDoc = await getDoc(doc(db, 'settings', 'aboutUsText'));
      let aboutUsMessage = defaultAboutUs;
      
      if (aboutDoc.exists()) {
        const data = aboutDoc.data();
        aboutUsMessage = data.text || defaultAboutUs;
      }
      
      setAboutUsMessage(aboutUsMessage);

      // Check for popup message
      let popupMessage: string | undefined;
      let showPopupValue = false;
      const popupDoc = await getDoc(doc(db, 'settings', 'popupMessage'));
      if (popupDoc.exists()) {
        const data = popupDoc.data();
        if (data.isActive && data.message && data.expiresAt && data.expiresAt.toDate() > new Date()) {
          popupMessage = data.message;
          showPopupValue = true;
          setPopupMessage(popupMessage);
          setShowPopup(true);
        }
      }

      // Update cache for next time
      try {
        await CacheUtils.setHomeContent({
          welcomeMessage,
          subtitleMessage,
          aboutUsMessage,
          popupMessage,
          showPopup: showPopupValue,
        }, 30);
      } catch (cacheError) {
        console.warn('Failed to update content cache:', cacheError);
      }
    } catch (error) {
      console.warn('Failed to fetch dynamic content:', error);
      // Fallback to translation values
      const fallbackWelcome = t('home.welcome');
      const fallbackSubtitle = t('home.subtitle');
      const fallbackAboutUs = 'ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.';
      setWelcomeMessage(fallbackWelcome);
      setSubtitleMessage(fallbackSubtitle);
      setAboutUsMessage(fallbackAboutUs);
    }
  };

  // Fetch images from Firebase gallery collection and settings
  const fetchImages = async () => {
      try {
        const db = getFirestore();
        
        // Load gallery images from the gallery collection
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
          console.log('📁 Settings document contains:', {
            atmosphereImage: atmosphereImage ? '✅ Found' : '❌ Not found',
            aboutUsImage: aboutUsImage ? '✅ Found' : '❌ Not found',
            allData: settingsData
          });
        } else {
          console.log('📁 No settings/images document found');
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
        
        const imagesData = {
          atmosphere: atmosphereImage,
          aboutUs: aboutUsImage,
          gallery: galleryImages,
        };
        
        setSettingsImages(imagesData);
        
        // Update cache for next time
        try {
          await CacheUtils.setHomeImages(imagesData, 30);
        } catch (cacheError) {
          console.warn('Failed to update images cache:', cacheError);
        }
        
        console.log('✅ Loaded Firebase images:', {
          atmosphere: atmosphereImage ? '✅ Found' : '❌ Not found',
          aboutUs: aboutUsImage ? '✅ Found' : '❌ Not found', 
          galleryCount: galleryImages.length,
          galleryImages: galleryImages.slice(0, 2) // Show first 2 URLs
        });

        // Check if we have placeholder images
        const hasPlaceholders = galleryImages.some(url => 
          url && (url.includes('placeholder') || url.includes('via.placeholder'))
        );
        
        if (hasPlaceholders) {
          console.log('⚠️ Found placeholder images in gallery, they will appear as gray cards');
          console.log('🔍 Placeholder URLs:', galleryImages.filter(url => 
            url && (url.includes('placeholder') || url.includes('via.placeholder'))
          ));
        }

        // If no gallery images found, initialize with default images
        if (galleryImages.length === 0) {
          console.log('🔍 No gallery images found. Checking all gallery collection documents...');
          const allGallerySnapshot = await getDocs(collection(db, 'gallery'));
          console.log('📋 All gallery collection documents:');
          allGallerySnapshot.forEach((doc) => {
            console.log('Document ID:', doc.id, 'Data:', doc.data());
          });
          
          // Try to initialize gallery with default images
          try {
            console.log('🚀 Initializing gallery with default images...');
            const { initializeGalleryImages } = await import('../../services/firebase');
            await initializeGalleryImages();
            
            // Reload images after initialization
            console.log('🔄 Reloading images after initialization...');
            const refreshedGalleryQuery = query(collection(db, 'gallery'), where('isActive', '==', true));
            const refreshedGallerySnapshot = await getDocs(refreshedGalleryQuery);
            const refreshedGalleryImages: string[] = [];
            
            refreshedGallerySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.type === 'gallery' && data.imageUrl) {
                refreshedGalleryImages.push(data.imageUrl);
              }
            });
            
            if (refreshedGalleryImages.length > 0) {
              setSettingsImages(prev => {
                const updated = {
                  ...prev,
                  gallery: refreshedGalleryImages,
                };
                // Update cache
                CacheUtils.setHomeImages(updated, 30).catch(err => 
                  console.warn('Failed to update images cache after init:', err)
                );
                return updated;
              });
              console.log('✅ Gallery initialized with', refreshedGalleryImages.length, 'images');
            }
          } catch (initError) {
            console.error('❌ Failed to initialize gallery:', initError);
          }
        } else if (hasPlaceholders) {
          // If we have placeholder images, try to replace them automatically
          try {
            console.log('🔄 Auto-replacing placeholder images...');
            const { replaceGalleryPlaceholders } = await import('../../services/firebase');
            await replaceGalleryPlaceholders();
            
            // Reload images after replacement
            console.log('🔄 Reloading images after replacement...');
            const refreshedGalleryQuery = query(collection(db, 'gallery'), where('isActive', '==', true));
            const refreshedGallerySnapshot = await getDocs(refreshedGalleryQuery);
            const refreshedGalleryImages: string[] = [];
            
            refreshedGallerySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.type === 'gallery' && data.imageUrl) {
                refreshedGalleryImages.push(data.imageUrl);
              }
            });
            
            if (refreshedGalleryImages.length > 0) {
              setSettingsImages(prev => {
                const updated = {
                  ...prev,
                  gallery: refreshedGalleryImages,
                };
                // Update cache
                CacheUtils.setHomeImages(updated, 30).catch(err => 
                  console.warn('Failed to update images cache after replacement:', err)
                );
                return updated;
              });
              console.log('✅ Gallery placeholders replaced with', refreshedGalleryImages.length, 'real images');
            }
          } catch (replaceError) {
            console.error('❌ Failed to replace placeholders:', replaceError);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch Firebase images:', err);
      }
    };

  // Remove auto-scroll for manual control
  // useEffect(() => {
  //   const galleryImages = [
  //     require('../../assets/images/gallery/1.jpg'),
  //     require('../../assets/images/gallery/2.jpg'),
  //     require('../../assets/images/gallery/3.jpg'),
  //     require('../../assets/images/gallery/4.jpg'),
  //     require('../../assets/images/gallery/5.jpg'),
  //   ];

  //   const interval = setInterval(() => {
  //     setGalleryIndex((prevIndex) => {
  //       const nextIndex = (prevIndex + 1) % galleryImages.length;
  //       if (carousel3DRef.current) {
  //         carousel3DRef.current.scrollTo({
  //           x: nextIndex * (cardWidth + cardSpacing),
  //           animated: true,
  //         });
  //       }
  //       return nextIndex;
  //     });
  //   }, 4000); // Change every 4 seconds

  //   return () => clearInterval(interval);
  // }, []);

  // Calculate 3D transform for each card
  const getCardTransform = (index: number, scrollXValue: Animated.Value) => {
    const cardOffset = index * (cardWidth + cardSpacing);
    const inputRange = [
      cardOffset - cardWidth - cardSpacing,
      cardOffset,
      cardOffset + cardWidth + cardSpacing,
    ];
    
    const translateX = scrollXValue.interpolate({
      inputRange,
      outputRange: [cardWidth / 2, 0, -cardWidth / 2],
      extrapolate: 'extend',
    });
    
    const scale = scrollXValue.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'extend',
    });
    
    const rotateY = scrollXValue.interpolate({
      inputRange,
      outputRange: ['-30deg', '0deg', '30deg'],
      extrapolate: 'extend',
    });
    
    const opacity = scrollXValue.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'extend',
    });

    return {
      transform: [
        { translateX },
        { scale },
        { rotateY },
        { perspective: 1000 },
      ],
      opacity,
    };
  };

  const handlePhoneCall = () => {
    Linking.openURL('tel:+972542280222').catch(() => {
      Alert.alert(t('common.error'), t('errors.phone_error'));
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/972542280222').catch(() => {
      Alert.alert(t('common.error'), t('errors.whatsapp_error'));
    });
  };

  const handleWaze = () => {
    Linking.openURL('https://waze.com/ul?ll=31.3167,34.5833&navigate=yes').catch(() => {
      Alert.alert(t('common.error'), t('errors.waze_error'));
    });
  };

  const handleSocialMedia = (platform: string) => {
    let url = '';
    switch (platform) {
      case 'facebook':
        url = 'https://www.facebook.com/turgibarber';
        break;
      case 'instagram':
        url = 'https://www.instagram.com/turgibarber';
        break;
      default:
        return;
    }
    
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), t('errors.link_error'));
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ScissorsLoader size={60} color="#007bff" accessibilityLabel={t('common.loading')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ron turgeman"
        onBellPress={() => setNotificationPanelVisible(true)} 
        onMenuPress={() => setSideMenuVisible(true)} 
      />
      <View style={styles.backgroundWrapper}>
        <ImageBackground
          source={settingsImages.atmosphere ? { uri: settingsImages.atmosphere } : require('../../assets/images/atmosphere/atmosphere.png')}
          style={styles.atmosphereImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
            style={styles.bottomGradient}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'transparent', 'transparent', 'rgba(0,0,0,0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sideGradient}
          />
          <View style={styles.designElements}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.line1} />
            <View style={styles.line2} />
          </View>
        </ImageBackground>
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentWrapper}>
          {/* Guest Mode Banner */}
          {isGuestMode && (
            <Animated.View 
              style={[
                styles.guestBanner,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.guestBannerText}>
                👀 מצב אורח - צפייה בלבד
              </Text>
              <Text style={styles.guestBannerSubtext}>
                להתחברות מלאה ולקביעת תורים
              </Text>
            </Animated.View>
          )}

          {/* Greeting and CTA Section */}
          <Animated.View 
            style={[
              styles.greetingCtaContainer, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)', 'rgba(3, 3, 3, 0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            />
            <NeonButton
              title={t('home.book_appointment')}
              onPress={() => {
                if (isGuestMode) {
                  Alert.alert(
                    'התחברות נדרשת',
                    'חייב להתחבר כדי לקבוע תור. האם תרצה להתחבר עכשיו?',
                    [
                      { text: 'ביטול', style: 'cancel' },
                      { text: 'התחבר', onPress: () => router.push('/auth-choice') }
                    ]
                  );
                } else {
                  onNavigate('booking');
                }
              }}
              variant="primary"
              style={styles.ctaButton}
            />
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{welcomeMessage || t('home.welcome')}</Text>
              <Text style={styles.subtitle}>{subtitleMessage || t('home.subtitle')}</Text>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[styles.quickActionsSection, { opacity: ctaFade }]}>
            <Text style={styles.sectionTitle}>{t('home.quick_actions')}</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => {
                  if (isGuestMode) {
                    Alert.alert(
                      'התחברות נדרשת',
                      'חייב להתחבר כדי לקבוע תור. האם תרצה להתחבר עכשיו?',
                      [
                        { text: 'ביטול', style: 'cancel' },
                        { text: 'התחבר', onPress: () => router.push('/auth-choice') }
                      ]
                    );
                  } else {
                    onNavigate('booking');
                  }
                }}
              >
                <Ionicons name="calendar" size={32} color="#007bff" />
                <Text style={styles.quickActionTitle}>{t('home.book_new')}</Text>
                <Text style={styles.quickActionSubtitle}>{t('home.book_subtitle')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => {
                  if (isGuestMode) {
                    Alert.alert(
                      'התחברות נדרשת',
                      'חייב להתחבר כדי לראות את התורים שלך. האם תרצה להתחבר עכשיו?',
                      [
                        { text: 'ביטול', style: 'cancel' },
                        { text: 'התחבר', onPress: () => router.push('/auth-choice') }
                      ]
                    );
                  } else {
                    onNavigate('my-appointments');
                  }
                }}
              >
                <Ionicons name="list" size={32} color="#007bff" />
                <Text style={styles.quickActionTitle}>{t('home.my_appointments')}</Text>
                <Text style={styles.quickActionSubtitle}>{t('home.appointments_subtitle')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => onNavigate('team')}
              >
                <Ionicons name="people" size={32} color="#007bff" />
                <Text style={styles.quickActionTitle}>{t('home.our_team')}</Text>
                <Text style={styles.quickActionSubtitle}>{t('home.team_subtitle')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 3D Gallery Carousel Section */}
          <Animated.View style={[styles.gallerySection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>{t('home.gallery')}</Text>
            <View style={styles.carousel3DContainer}>
              <Animated.ScrollView 
                ref={carousel3DRef}
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.carousel3DContent}
                pagingEnabled={false}
                decelerationRate="normal"
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false, listener: handleScroll }
                )}
                scrollEventThrottle={16}
              >
                {infiniteImages.map((img, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      const imageSource = typeof img === 'string' ? img : img;
                      setSelectedImage(imageSource);
                      setShowImageModal(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <Animated.View 
                      style={[
                        styles.carousel3DCard,
                        getCardTransform(index, scrollX),
                      ]}
                    >
                      <Image
                        source={typeof img === 'string' ? { uri: img } : img}
                        style={styles.carousel3DImage}
                        resizeMode="cover"
                      />
                      <View style={styles.carousel3DOverlay}>
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={styles.carousel3DGradient}
                        />
                        <View style={styles.tapIndicator}>
                          <Ionicons name="expand" size={20} color="#fff" />
                          <Text style={styles.tapIndicatorText}>לחץ לצפייה</Text>
                        </View>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>
            </View>
          </Animated.View>

          {/* About Us Section */}
          <Animated.View style={[styles.aboutSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>{t('home.about')}</Text>
            <View style={styles.aboutCard}>
              <Image
                source={settingsImages.aboutUs ? { uri: settingsImages.aboutUs } : require('../../assets/images/ABOUT US/aboutus.png')}
                style={styles.aboutImageWide}
                resizeMode="cover"
              />
              <View style={styles.aboutContent}>
                <Text style={styles.aboutText}>
                  {aboutUsMessage || `ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית. 
                  
✂️ AI: "המספרה שלנו היא לא רק מקום להסתפר, אלא מקום להרגיש בו טוב, להירגע ולצאת עם חיוך. כל תספורת היא יצירת אמנות!"`}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Contact Section */}
          <Animated.View style={[styles.contactSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>{t('home.contact')}</Text>
            <View style={styles.contactGrid}>
              <TouchableOpacity style={styles.contactCard} onPress={handlePhoneCall}>
                <Ionicons name="call" size={32} color="#007bff" />
                <Text style={styles.contactTitle}>{t('home.call_us')}</Text>
                <Text style={styles.contactSubtitle}>{t('home.phone')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={32} color="#25d366" />
                <Text style={styles.contactTitle}>{t('home.whatsapp')}</Text>
                <Text style={styles.contactSubtitle}>{t('home.send_message')}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.socialRow}>
              <TouchableOpacity onPress={() => handleSocialMedia('facebook')} style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={28} color="#1877f2" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSocialMedia('instagram')} style={styles.socialButton}>
                <Ionicons name="logo-instagram" size={28} color="#e4405f" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerCard}>
            <Text style={styles.footerText}>מושב יושייביה</Text>
            <Text style={styles.footerCredit}>{t('home.powered_by')}</Text>
            <TouchableOpacity onPress={() => setShowTerms(true)}>
              <Text style={styles.footerTerms}>{t('home.terms')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <SideMenu 
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
        onNavigate={(screen) => {
          console.log('HomeScreen onNavigate called with:', screen);
          onNavigate(screen);
        }}
        onNotificationPress={() => setNotificationPanelVisible(true)}
      />
      
      <NotificationPanel 
        visible={notificationPanelVisible}
        onClose={() => setNotificationPanelVisible(false)}
      />
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />
      
      {/* Admin Popup Message */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPopup}
        onRequestClose={() => setShowPopup(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>הודעה מהמספרה</Text>
              <TouchableOpacity onPress={() => setShowPopup(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.popupMessage}>{popupMessage}</Text>
            <TouchableOpacity 
              style={styles.popupButton} 
              onPress={() => setShowPopup(false)}
            >
              <Text style={styles.popupButtonText}>הבנתי</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Viewing Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showImageModal}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseArea}
            onPress={() => setShowImageModal(false)}
          >
            <View style={styles.imageModalContent}>
              <Image
                source={typeof selectedImage === 'string' ? { uri: selectedImage } : selectedImage}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.imageModalCloseButton}
                onPress={() => setShowImageModal(false)}
              >
                <Ionicons name="close" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  guestBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  guestBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  guestBannerSubtext: {
    fontSize: 14,
    color: '#856404',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  backgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    height: height * 0.5, // הגדלת הרכיב מ-0.4 ל-0.5 כדי שיתפוס יותר מקום
    width: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  atmosphereImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    marginTop: 60, // move image down so overlay covers less
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  sideGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  designElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -50,
    left: -50,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: 100,
    right: -50,
  },
  line1: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    bottom: 0,
    left: 0,
  },
  line2: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: 0,
    left: 0,
  },
  contentWrapper: {
    paddingTop: height * 0.35 + 90,
  },
  greetingCtaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32, // היה 20
    marginHorizontal: 8, // היה 16
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  greetingContainer: {
    flex: 1,
    marginLeft: 16,
  },
  greeting: {
    fontSize: 18, // היה 24
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'right',
  },
  ctaButton: {
    minWidth: 100,
  },
  neonButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonButtonPrimary: {
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  neonButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  neonButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  neonButtonTextPrimary: {
    color: '#fff',
  },
  neonButtonTextSecondary: {
    color: '#000',
  },
  quickActionsSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    marginTop: 8,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  gallerySection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  galleryCarouselContent: {
    paddingHorizontal: 4,
  },
  carousel3DContainer: {
    height: 480, // Increased to accommodate larger cards (was 320)
    justifyContent: 'center',
    alignItems: 'center',
  },
  carousel3DContent: {
    paddingHorizontal: 16,
  },
  carousel3DCard: {
    width: 285, // Increased by 1.5x (was 190)
    height: 420, // Increased by 1.5x (was 280)
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#eee',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  carousel3DImage: {
    width: '100%',
    height: '100%',
  },
  carousel3DOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  carousel3DGradient: {
    flex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tapIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullScreenImage: {
    width: '90%',
    height: '80%',
    borderRadius: 8,
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  // Legacy styles (can be removed if not used elsewhere)
  galleryCard: {
    width: 180,
    height: 240,
    borderRadius: 24,
    marginRight: 20,
    backgroundColor: '#eee',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  galleryGradient: {
    flex: 1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  aboutSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  aboutImageWide: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  aboutContent: {
    flex: 1,
    alignItems: 'center',
  },
  aboutText: {
    fontSize: 17,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 26,
  },
  wazeButton: {
    backgroundColor: '#50C878',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wazeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  contactSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  contactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    marginTop: 8,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  socialButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerCard: {
    backgroundColor: 'rgba(240,240,240,0.95)',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerWaze: {
    fontSize: 14,
    color: '#007bff',
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  footerCredit: {
    fontSize: 12,
    color: '#888',
    marginTop: 16,
  },
  footerTerms: {
    fontSize: 12,
    color: '#007bff',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
  },
  popupMessage: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    textAlign: 'right',
    marginBottom: 24,
  },
  popupButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});