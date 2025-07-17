import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { checkIsAdmin, onAuthStateChange, initializeCollections } from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface AdminHomeScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminHomeScreen: React.FC<AdminHomeScreenProps> = ({ onNavigate, onBack }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        const adminStatus = await checkIsAdmin(user.uid);
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          setToast({
            visible: true,
            message: 'אין לך הרשאות מנהל',
            type: 'error'
          });
          setTimeout(() => onNavigate('home'), 2000);
        }
      } else {
        onNavigate('home');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const adminMenuItems = [
    {
      title: 'ניהול תורים',
      subtitle: 'צפה וערוך תורים קיימים',
      icon: 'calendar',
      screen: 'admin-appointments',
      color: '#007bff'
    },
    {
      title: 'ניהול טיפולים ומחירים',
      subtitle: 'הוסף, ערוך ומחק טיפולים',
      icon: 'cut',
      screen: 'admin-treatments',
      color: '#28a745'
    },
    {
      title: 'ניהול הצוות',
      subtitle: 'הוסף ספרים וערוך פרופילים',
      icon: 'people',
      screen: 'admin-team',
      color: '#ffc107'
    },
    {
      title: 'ניהול הגלריה',
      subtitle: 'העלה תמונות וערוך תמונות רקע',
      icon: 'images',
      screen: 'admin-gallery',
      color: '#dc3545'
    },
    {
      title: 'הגדרות זמינות',
      subtitle: 'הגדר שעות פעילות לספרים',
      icon: 'time',
      screen: 'admin-availability',
      color: '#6f42c1'
    },
    {
      title: 'צפה כלקוח',
      subtitle: 'צפה באפליקציה כמשתמש רגיל',
      icon: 'eye',
      screen: 'home',
      color: '#17a2b8'
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>בודק הרשאות...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color="#dc3545" />
          <Text style={styles.errorText}>אין לך הרשאות מנהל</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
            <Text style={styles.backButtonText}>חזור לעמוד הבית</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="פאנל מנהל"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('home'))}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Welcome Header */}
          <View style={styles.welcomeSection}>
            <LinearGradient
              colors={['#000000', '#333333']}
              style={styles.welcomeGradient}
            >
              <Text style={styles.welcomeTitle}>ברוך הבא למנהל המערכת</Text>
              <Text style={styles.welcomeSubtitle}>נהל את הברברשופ שלך בקלות</Text>
            </LinearGradient>
          </View>

          {/* Admin Menu Grid */}
          <View style={styles.menuGrid}>
            {adminMenuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  if (item.screen === 'home') {
                    showToast('עובר לתצוגת לקוח');
                  } else {
                    showToast(`פותח ${item.title}`);
                  }
                  onNavigate(item.screen);
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={28} color="#fff" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>סטטיסטיקות מהירות</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>תורים היום</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>3</Text>
                <Text style={styles.statLabel}>ספרים פעילים</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>טיפולים</Text>
              </View>
            </View>
          </View>

          {/* Initialize Collections Button */}
          <View style={styles.initSection}>
            <TouchableOpacity
              style={styles.initButton}
              onPress={async () => {
                try {
                  await initializeCollections();
                  showToast('Collections initialized successfully!');
                } catch (error) {
                  showToast('Error initializing collections', 'error');
                }
              }}
            >
              <Text style={styles.initButtonText}>Initialize Database Collections</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
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
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  menuGrid: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  initSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  initButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  initButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AdminHomeScreen;