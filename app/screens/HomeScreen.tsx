import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  useEffect(() => {
    loadData();
  }, []);

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
        <LinearGradient colors={[colors.background, colors.primary]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>טוען...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.primary]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>שלום, אוראל</Text>
            <Text style={styles.subtitle}>מוכן לתספורת חדשה?</Text>
          </View>

          {/* Hero Banner */}
          {settings?.homepageBanner && (
            <View style={styles.bannerContainer}>
              <Image 
                source={{ uri: settings.homepageBanner }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
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
          </View>

          {/* Featured Treatments */}
          <View style={styles.section}>
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
          </View>

          {/* User Info Card */}
          <View style={styles.userCard}>
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
          </View>

          {/* Main CTA */}
          <View style={styles.ctaSection}>
            <NeonButton
              title="הזמנת תור"
              onPress={() => onNavigate('booking')}
              variant="primary"
              style={styles.ctaButton}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textHebrew,
    marginBottom: 8,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  bannerContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: 150,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textHebrew,
    marginBottom: 16,
    textAlign: 'right',
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
  ctaSection: {
    marginBottom: 40,
  },
  ctaButton: {
    width: '100%',
  },
}); 