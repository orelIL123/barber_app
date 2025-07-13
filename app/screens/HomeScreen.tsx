import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
} from 'react-native';

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
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
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

  const handlePhoneCall = () => {
    Linking.openURL('tel:+972501234567').catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את אפליקציית הטלפון');
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/972501234567').catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את WhatsApp');
    });
  };

  const handleWaze = () => {
    Linking.openURL('https://waze.com/ul?ll=32.0853,34.7818&navigate=yes').catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את Waze');
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
      Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>שלום, ברוכים הבאים</Text>
              <Text style={styles.subtitle}>ל-TURGI ברברשופ</Text>
            </View>
            <NeonButton
              title="הזמן תור"
              onPress={() => onNavigate('booking')}
              variant="primary"
              style={styles.ctaButton}
            />
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[styles.quickActionsSection, { opacity: ctaFade }]}>
            <Text style={styles.sectionTitle}>פעולות מהירות</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => onNavigate('booking')}
              >
                <Text style={styles.quickActionIcon}>📅</Text>
                <Text style={styles.quickActionTitle}>הזמנת תור</Text>
                <Text style={styles.quickActionSubtitle}>קבע תור חדש</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => onNavigate('appointments')}
              >
                <Text style={styles.quickActionIcon}>📋</Text>
                <Text style={styles.quickActionTitle}>התורים שלי</Text>
                <Text style={styles.quickActionSubtitle}>צפה בתורים</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => onNavigate('barbers')}
              >
                <Text style={styles.quickActionIcon}>✂️</Text>
                <Text style={styles.quickActionTitle}>הספרים שלנו</Text>
                <Text style={styles.quickActionSubtitle}>הכר את הצוות</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Gallery Section */}
          <Animated.View style={[styles.gallerySection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>הגלריה שלנו</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.galleryCarouselContent}
            >
              <View style={[styles.galleryCard, { transform: [{ rotate: '-3deg' }] }]}>
                <Image
                  source={require('../../assets/images/gallery/1.jpg')}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              </View>
              <View style={[styles.galleryCard, { transform: [{ rotate: '2deg' }] }]}>
                <Image
                  source={require('../../assets/images/gallery/2.jpg')}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              </View>
              <View style={[styles.galleryCard, { transform: [{ rotate: '-1deg' }] }]}>
                <Image
                  source={require('../../assets/images/gallery/3.jpg')}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              </View>
              <View style={[styles.galleryCard, { transform: [{ rotate: '1deg' }] }]}>
                <Image
                  source={require('../../assets/images/gallery/4.jpg')}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              </View>
            </ScrollView>
          </Animated.View>

          {/* About Us Section */}
          <Animated.View style={[styles.aboutSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>קצת עלינו</Text>
            <View style={styles.aboutCard}>
              <Image
                source={require('../../assets/images/ABOUT US/aboutus.png')}
                style={styles.aboutImageWide}
                resizeMode="cover"
              />
              <View style={styles.aboutContent}>
                <Text style={styles.aboutText}>
                  ברוכים הבאים ל-TURGI ברברשופ! אנחנו צוות מקצועי עם תשוקה לאסתטיקה, שירות וחוויה. 
                  בואו להתרענן, להרגיש בבית ולצאת עם חיוך.
                </Text>
                <TouchableOpacity 
                  style={styles.wazeButton} 
                  onPress={handleWaze}
                >
                  <Text style={styles.wazeButtonText}>נווט עם Waze</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Contact Section */}
          <Animated.View style={[styles.contactSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>צרו קשר</Text>
            <View style={styles.contactGrid}>
              <TouchableOpacity style={styles.contactCard} onPress={handlePhoneCall}>
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactTitle}>התקשרו</Text>
                <Text style={styles.contactSubtitle}>050-123-4567</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp}>
                <Text style={styles.contactIcon}>💬</Text>
                <Text style={styles.contactTitle}>WhatsApp</Text>
                <Text style={styles.contactSubtitle}>שלחו הודעה</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.socialRow}>
              <TouchableOpacity onPress={() => handleSocialMedia('facebook')}>
                <Text style={styles.socialIcon}>📘</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSocialMedia('instagram')}>
                <Text style={styles.socialIcon}>📸</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerCard}>
            <Text style={styles.footerText}>רח׳ הדוגמא 1, תל אביב</Text>
            <TouchableOpacity onPress={handleWaze}>
              <Text style={styles.footerWaze}>נווט עם Waze</Text>
            </TouchableOpacity>
            <Text style={styles.footerCredit}>Powered by Orel Aharon</Text>
            <TouchableOpacity onPress={() => Alert.alert('תנאי שימוש', 'תנאי השימוש יוצגו כאן')}>
              <Text style={styles.footerTerms}>תנאי שימוש</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: height * 0.35,
  },
  greetingCtaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  greetingContainer: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
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
  galleryCard: {
    width: 120,
    height: 160,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: '#eee',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
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
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  aboutImageWide: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  aboutContent: {
    flex: 1,
    alignItems: 'center',
  },
  aboutText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
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
  contactIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
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
  },
  socialIcon: {
    fontSize: 32,
    marginHorizontal: 15,
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