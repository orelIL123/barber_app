import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CustomCard } from '../components/CustomCard';
import { NeonButton } from '../components/NeonButton';
import { collections, db, Settings, Treatment } from '../config/firebase';
import { colors } from '../constants/colors';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      // Load treatments
      const treatmentsSnapshot = await getDocs(collection(db, collections.treatments));
      const treatmentsData = treatmentsSnapshot.docs.map(doc => ({
        ...doc.data(),
        treatmentId: doc.id,
      })) as Treatment[];
      setTreatments(treatmentsData);

      // Load settings
      const settingsDoc = await getDoc(doc(db, collections.settings, 'main'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as Settings);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'הזמנת תור', subtitle: 'קבע תור חדש', action: () => onNavigate('booking') },
    { title: 'התורים שלי', subtitle: 'צפה בתורים הקיימים', action: () => onNavigate('appointments') },
    { title: 'הספרים שלנו', subtitle: 'הכר את הצוות', action: () => onNavigate('barbers') },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#222', fontSize: 18 }}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundWrapper}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80' }}
          style={styles.atmosphereImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.38)']}
            style={styles.gradientOverlay}
            pointerEvents="none"
          />
          <View style={styles.designElements}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.line1} />
            <View style={styles.line2} />
          </View>
        </ImageBackground>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 220, paddingBottom: 32 }}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.header}>
            <Text style={styles.greeting}>שלום, אוראל</Text>
            <Text style={styles.subtitle}>מוכן לתספורת חדשה?</Text>
          </View>
          <View style={styles.ctaSection}>
            <NeonButton
              title="הזמן תור"
              onPress={() => onNavigate('booking')}
              variant="primary"
              style={styles.ctaButton}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryCarousel}>
            <View style={[styles.galleryCard, { transform: [{ rotate: '-7deg' }, { scale: 0.96 }] }]}> 
              <Image source={{uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80'}} style={styles.galleryImage} />
            </View>
            <View style={[styles.galleryCard, { transform: [{ rotate: '-2deg' }, { scale: 1.04 }] }]}> 
              <Image source={{uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'}} style={styles.galleryImage} />
            </View>
            <View style={[styles.galleryCard, { transform: [{ rotate: '6deg' }, { scale: 0.98 }] }]}> 
              <Image source={{uri: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80'}} style={styles.galleryImage} />
            </View>
          </ScrollView>
        </View>
        {/* About Us Section */}
        <View style={styles.aboutCard}>
          <Image source={{uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'}} style={styles.aboutImage} />
          <View style={styles.aboutContent}>
            <Text style={styles.aboutTitle}>קצת עלינו</Text>
            <Text style={styles.aboutText}>ברוכים הבאים ל-TURGI ברברשופ! אנחנו צוות מקצועי עם תשוקה לאסתטיקה, שירות וחוויה. בואו להתרענן, להרגיש בבית ולצאת עם חיוך.</Text>
            <TouchableOpacity style={styles.wazeButton} onPress={() => Linking.openURL('https://waze.com/ul?ll=32.0853,34.7818&navigate=yes')}>
              <Text style={styles.wazeButtonText}>נווט עם Waze</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Quick Actions */}
        <Animated.View style={[styles.section, { opacity: cardsFade }]}>
          <Text style={styles.sectionTitle}>פעולות מהירות</Text>
          {quickActions.map((action, index) => (
            <CustomCard
              key={index}
              title={action.title}
              subtitle={action.subtitle}
              onPress={action.action}
              style={styles.actionCard}
            />
          ))}
        </Animated.View>
        {/* Featured Treatments */}
        <Animated.View style={[styles.section, { opacity: cardsFade }]}>
          <Text style={styles.sectionTitle}>השירותים שלנו</Text>
          <View style={styles.treatmentsGrid}>
            {treatments.slice(0, 4).map((treatment) => (
              <CustomCard
                key={treatment.treatmentId}
                title={treatment.title}
                subtitle={`₪${treatment.price} • ${treatment.duration} דקות`}
                onPress={() => onNavigate('select-treatment')}
                style={styles.treatmentCard}
              >
                {treatment.image && (
                  <Image 
                    source={{ uri: treatment.image }}
                    style={styles.treatmentImage}
                    resizeMode="cover"
                  />
                )}
              </CustomCard>
            ))}
          </View>
        </Animated.View>
        {/* User Info Card */}
        <Animated.View style={[styles.userCard, { opacity: cardsFade }]}>
          <CustomCard title="הפרופיל שלי" subtitle="אוראל כהן">
            <View style={styles.userInfo}>
              <Text style={styles.userText}>התור הבא: יום שלישי, 15:30</Text>
              <NeonButton
                title="הזמן שוב"
                onPress={() => onNavigate('booking')}
                variant="secondary"
                style={styles.rebookButton}
              />
            </View>
          </CustomCard>
        </Animated.View>
        {/* Footer */}
        <View style={styles.footerCard}>
          <View style={styles.socialRow}>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.instagram.com/')}> 
              <Text style={styles.socialIcon}>📸</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.facebook.com/')}> 
              <Text style={styles.socialIcon}>📘</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/123456789')}> 
              <Text style={styles.socialIcon}>💬</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>רח׳ הדוגמא 1, תל אביב</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://waze.com/ul?ll=32.0853,34.7818&navigate=yes')}>
            <Text style={styles.footerWaze}>נווט עם Waze</Text>
          </TouchableOpacity>
          <Text style={styles.footerCredit}>Powered by orel aharon</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://example.com/terms')}>
            <Text style={styles.footerTerms}>תנאי שימוש</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fa', // Light, modern background
  },
  scrollView: {
    flex: 1,
    padding: 0,
  },
  cardWrapper: {
    paddingHorizontal: 0,
    marginTop: 0,
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    marginTop: 16,
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'right',
    fontFamily: 'Heebo',
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'right',
    marginBottom: 18,
    fontFamily: 'Heebo',
  },
  ctaSection: {
    marginBottom: 18,
    alignItems: 'flex-end',
  },
  ctaButton: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  ctaButtonBlack: {
    backgroundColor: '#111',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    paddingHorizontal: 36,
    paddingVertical: 14,
    minWidth: 140,
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'Heebo',
  },
  galleryCarousel: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  galleryCard: {
    width: 110,
    height: 140,
    borderRadius: 18,
    marginRight: 14,
    backgroundColor: '#eee',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 4,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
    fontFamily: 'Heebo',
  },
  actionCard: {
    marginBottom: 12,
  },
  treatmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  treatmentCard: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  treatmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginTop: 8,
  },
  userCard: {
    marginBottom: 24,
  },
  userInfo: {
    alignItems: 'center',
  },
  userText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  rebookButton: {
    width: '100%',
  },
  backgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    height: 220, // Only top hero
    width: '100%',
  },
  atmosphereImage: {
    width: '100%',
    height: 220,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'transparent',
    // backgroundGradient: { ... } // removed, replaced with LinearGradient above
  },
  designElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
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
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  gradient: {
    flex: 1,
    paddingTop: 320, // Adjust based on image height
  },
  aboutSection: {
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  aboutImage: {
    width: 90,
    height: 90,
    borderRadius: 18,
    marginRight: 18,
  },
  aboutContent: {
    flex: 1,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textHebrew,
    marginBottom: 6,
    textAlign: 'right',
  },
  aboutText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'right',
  },
  wazeButton: {
    backgroundColor: '#1db7f6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    shadowColor: '#1db7f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  wazeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  footer: {
    marginTop: 24,
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  socialRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 18,
  },
  socialIcon: {
    fontSize: 26,
    marginHorizontal: 8,
  },
  footerText: {
    color: '#222',
    fontSize: 15,
    marginBottom: 4,
  },
  footerWaze: {
    color: '#1db7f6',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  footerCredit: {
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
  },
  footerTerms: {
    color: '#1db7f6',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 10,
  },
  footerCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
}); 