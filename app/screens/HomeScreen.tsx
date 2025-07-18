import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import SideMenu from '../components/SideMenu';
import TopNav from '../components/TopNav';
import NotificationPanel from '../components/NotificationPanel';

const { width, height } = Dimensions.get('window');

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
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

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;
  const galleryScrollRef = useRef<ScrollView>(null);
  
  // 3D Carousel refs
  const carousel3DRef = useRef<ScrollView>(null);
  const cardWidth = 140;
  const cardHeight = 200;
  const cardSpacing = 4;
  const centerOffset = width / 2 - cardWidth / 2;
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simulate loading (splash) for 3 seconds
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (!loading && imageLoaded) {
      // Start animations
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(headerFade, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ctaFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardsFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, imageLoaded]);

  // Remove auto-scroll for manual control
  // useEffect(() => {
  //   const galleryImages = [
  //     require('../../assets/images/gallery/1.jpg'),
  //     require('../../assets/images/gallery/2.jpg'),
  //     require('../../assets/images/gallery/3.jpg'),
  //     require('../../assets/images/gallery/4.jpg'),
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
  const getCardTransform = (index: number, scrollX: number) => {
    const cardOffset = index * (cardWidth + cardSpacing);
    const inputRange = [
      cardOffset - cardWidth - cardSpacing,
      cardOffset,
      cardOffset + cardWidth + cardSpacing,
    ];
    
    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [cardWidth / 2, 0, -cardWidth / 2],
      extrapolate: 'clamp',
    });
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });
    
    const rotateY = scrollX.interpolate({
      inputRange,
      outputRange: ['-45deg', '0deg', '45deg'],
      extrapolate: 'clamp',
    });
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
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
    Linking.openURL('tel:+972501234567').catch(() => {
      Alert.alert(t('common.error'), t('errors.phone_error'));
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/972501234567').catch(() => {
      Alert.alert(t('common.error'), t('errors.whatsapp_error'));
    });
  };

  const handleWaze = () => {
    Linking.openURL('https://waze.com/ul?ll=32.0853,34.7818&navigate=yes').catch(() => {
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
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title={t('home.title')} 
        onBellPress={() => setNotificationPanelVisible(true)} 
        onMenuPress={() => setSideMenuVisible(true)} 
      />
      <View style={styles.backgroundWrapper}>
        <ImageBackground
          source={require('../../assets/images/atmosphere/atmosphere.png')}
          style={styles.atmosphereImage}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        >
          <View style={styles.overlay} />
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
              onPress={() => onNavigate('booking')}
              variant="primary"
              style={styles.ctaButton}
            />
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{t('home.welcome')}</Text>
              <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[styles.quickActionsSection, { opacity: ctaFade }]}>
            <Text style={styles.sectionTitle}>{t('home.quick_actions')}</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => onNavigate('booking')}
              >
                <Ionicons name="calendar" size={32} color="#007bff" />
                <Text style={styles.quickActionTitle}>{t('home.book_new')}</Text>
                <Text style={styles.quickActionSubtitle}>{t('home.book_subtitle')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => onNavigate('profile')}
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
                  { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
              >
                {[
                  require('../../assets/images/gallery/1.jpg'),
                  require('../../assets/images/gallery/2.jpg'),
                  require('../../assets/images/gallery/3.jpg'),
                  require('../../assets/images/gallery/4.jpg'),
                  require('../../assets/images/gallery/1.jpg'),
                  require('../../assets/images/gallery/2.jpg'),
                  require('../../assets/images/gallery/3.jpg'),
                  require('../../assets/images/gallery/4.jpg'),
                ].map((imageSource, index) => (
                  <Animated.View 
                    key={index} 
                    style={[
                      styles.carousel3DCard,
                      getCardTransform(index, scrollX),
                    ]}
                  >
                    <Image
                      source={imageSource}
                      style={styles.carousel3DImage}
                      resizeMode="cover"
                    />
                    <View style={styles.carousel3DOverlay}>
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.carousel3DGradient}
                      />
                    </View>
                  </Animated.View>
                ))}
              </Animated.ScrollView>
            </View>
          </Animated.View>

          {/* About Us Section */}
          <Animated.View style={[styles.aboutSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>{t('home.about')}</Text>
            <View style={styles.aboutCard}>
              <Image
                source={require('../../assets/images/ABOUT US/aboutus.png')}
                style={styles.aboutImageWide}
                resizeMode="cover"
              />
              <View style={styles.aboutContent}>
                <Text style={styles.aboutText}>
                  {t('home.about_text')}
                </Text>
                <TouchableOpacity 
                  style={styles.wazeButton} 
                  onPress={handleWaze}
                >
                  <Text style={styles.wazeButtonText}>{t('home.navigate_waze')}</Text>
                </TouchableOpacity>
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
            <Text style={styles.footerText}>{t('home.address')}</Text>
            <TouchableOpacity onPress={handleWaze}>
              <Text style={styles.footerWaze}>{t('home.navigate_waze')}</Text>
            </TouchableOpacity>
            <Text style={styles.footerCredit}>{t('home.powered_by')}</Text>
            <TouchableOpacity onPress={() => Alert.alert(t('home.terms'), t('settings.terms_text'))}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    height: height * 0.4,
    width: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  atmosphereImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  galleryCarouselContent: {
    paddingHorizontal: 4,
  },
  carousel3DContainer: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carousel3DContent: {
    paddingHorizontal: 15,
  },
  carousel3DCard: {
    width: 140,
    height: 200,
    borderRadius: 18,
    marginRight: 4,
    backgroundColor: '#eee',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
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
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
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
});