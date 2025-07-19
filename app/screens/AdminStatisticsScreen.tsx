import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    checkIsAdmin,
    getAllAppointments,
    getBarbers,
    getTreatments,
    onAuthStateChange,
    updateAppointment
} from '../../services/firebase';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface AdminStatisticsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

interface StatisticsData {
  totalRevenue: number;
  totalCustomers: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  popularTreatments: Array<{ name: string; count: number; revenue: number }>;
  barberStats: Array<{ name: string; appointments: number; revenue: number }>;
}

const AdminStatisticsScreen: React.FC<AdminStatisticsScreenProps> = ({ onNavigate, onBack }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsData>({
    totalRevenue: 0,
    totalCustomers: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    popularTreatments: [],
    barberStats: []
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        const adminStatus = await checkIsAdmin(user.uid);
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          onNavigate('home');
        }
      } else {
        onNavigate('home');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadStatistics();
      
      // Set up automatic appointment completion check
      const interval = setInterval(() => {
        checkAndCompleteAppointments();
      }, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const checkAndCompleteAppointments = async () => {
    try {
      const appointments = await getAllAppointments();
      const now = new Date();
      let completedCount = 0;
      
      for (const appointment of appointments) {
        // Only process scheduled appointments
        if ((appointment.status as any) !== 'scheduled') continue;
        
        let appointmentDate: Date;
        try {
          const dateValue = appointment.date as any;
          if (dateValue && typeof dateValue.toDate === 'function') {
            appointmentDate = dateValue.toDate();
          } else if (dateValue) {
            appointmentDate = new Date(dateValue);
          } else {
            continue;
          }
        } catch (error) {
          console.warn('Error parsing appointment date for auto-completion:', error);
          continue;
        }
        
        // Check if appointment time has passed (add 30 minutes buffer for treatment duration)
        const appointmentEndTime = new Date(appointmentDate.getTime() + 30 * 60000);
        
        if (now > appointmentEndTime) {
          console.log(`🕐 Auto-completing appointment: ${appointment.id} at ${appointmentDate.toLocaleString()}`);
          
          // Update appointment status to completed
          await updateAppointment(appointment.id, { status: 'completed' as any });
          completedCount++;
        }
      }
      
      // If any appointments were completed, reload statistics
      if (completedCount > 0) {
        console.log(`✅ Auto-completed ${completedCount} appointments`);
        setTimeout(() => {
          loadStatistics();
        }, 1000);
      }
    } catch (error) {
      console.error('Error in automatic appointment completion:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Load all data
      const [appointments, barbers, treatments] = await Promise.all([
        getAllAppointments(),
        getBarbers(),
        getTreatments()
      ]);

      // Calculate statistics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let weeklyRevenue = 0;
      let completedAppointments = 0;
      let pendingAppointments = 0;
      const treatmentCounts: { [key: string]: { count: number; revenue: number } } = {};
      const barberCounts: { [key: string]: { appointments: number; revenue: number } } = {};

      // Process appointments
      appointments.forEach(appointment => {
        let appointmentDate: Date;
        
        try {
          // Handle different date formats safely
          const dateValue = appointment.date as any;
          
          if (dateValue && typeof dateValue.toDate === 'function') {
            // Firestore Timestamp
            appointmentDate = dateValue.toDate();
          } else if (dateValue && typeof dateValue === 'string') {
            // Date is stored as string
            appointmentDate = new Date(dateValue);
          } else if (dateValue) {
            // Regular date object
            appointmentDate = new Date(dateValue);
          } else {
            // Skip appointments without date
            return;
          }
        } catch (error) {
          console.warn('Error parsing appointment date:', error);
          return; // Skip this appointment
        }
        
        const treatment = treatments.find(t => t.id === appointment.treatmentId);
        
        if (treatment) {
          const revenue = treatment.price;
          
          if (appointment.status === 'completed') {
            totalRevenue += revenue;
            completedAppointments++;
            
            // Monthly revenue
            if (appointmentDate >= thisMonth) {
              monthlyRevenue += revenue;
            }
            
            // Weekly revenue
            if (appointmentDate >= thisWeek) {
              weeklyRevenue += revenue;
            }
            
            // Treatment statistics
            if (!treatmentCounts[treatment.name]) {
              treatmentCounts[treatment.name] = { count: 0, revenue: 0 };
            }
            treatmentCounts[treatment.name].count++;
            treatmentCounts[treatment.name].revenue += revenue;
            
            // Barber statistics
            const barber = barbers.find(b => b.id === appointment.barberId);
            if (barber) {
              if (!barberCounts[barber.name]) {
                barberCounts[barber.name] = { appointments: 0, revenue: 0 };
              }
              barberCounts[barber.name].appointments++;
              barberCounts[barber.name].revenue += revenue;
            }
          } else if ((appointment.status as any) === 'scheduled' || (appointment.status as any) === 'confirmed') {
            pendingAppointments++;
          }
        }
      });

      // Convert to arrays and sort
      const popularTreatments = Object.entries(treatmentCounts)
        .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const barberStats = Object.entries(barberCounts)
        .map(([name, data]) => ({ name, appointments: data.appointments, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      setStats({
        totalRevenue,
        totalCustomers: completedAppointments,
        totalAppointments: appointments.length,
        completedAppointments,
        pendingAppointments,
        monthlyRevenue,
        weeklyRevenue,
        popularTreatments,
        barberStats
      });

    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString()}`;
  };

  const StatCard: React.FC<{ title: string; value: string; subtitle?: string; color: string; icon: string }> = ({ 
    title, value, subtitle, color, icon 
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען סטטיסטיקות...</Text>
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
        title="סטטיסטיקות עסק"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#17a2b8', '#138496']}
              style={styles.headerGradient}
            >
              <Text style={styles.headerTitle}>דשבורד עסקי</Text>
              <Text style={styles.headerSubtitle}>סטטיסטיקות מפורטות על העסק שלך</Text>
            </LinearGradient>
          </View>

          {/* Key Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>מדדים עיקריים</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="הכנסות כוללות"
                value={formatCurrency(stats.totalRevenue)}
                subtitle="כל הזמנים"
                color="#28a745"
                icon="cash"
              />
              <StatCard
                title="לקוחות החודש"
                value={stats.totalCustomers.toString()}
                subtitle="לקוחות מרוצים"
                color="#007bff"
                icon="people"
              />
              <StatCard
                title="תורים הושלמו"
                value={stats.completedAppointments.toString()}
                subtitle="תורים מוצלחים"
                color="#ffc107"
                icon="checkmark-circle"
              />
              <StatCard
                title="תורים ממתינים"
                value={stats.pendingAppointments.toString()}
                subtitle="תורים בהמתנה"
                color="#dc3545"
                icon="time"
              />
            </View>
          </View>

          {/* Revenue Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>הכנסות לפי תקופה</Text>
            <View style={styles.revenueGrid}>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueLabel}>הכנסות השבוע</Text>
                <Text style={styles.revenueValue}>{formatCurrency(stats.weeklyRevenue)}</Text>
              </View>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueLabel}>הכנסות החודש</Text>
                <Text style={styles.revenueValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
              </View>
            </View>
          </View>

          {/* Popular Treatments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>טיפולים פופולריים</Text>
            {stats.popularTreatments.map((treatment, index) => (
              <View key={index} style={styles.treatmentRow}>
                <View style={styles.treatmentInfo}>
                  <Text style={styles.treatmentName}>{treatment.name}</Text>
                  <Text style={styles.treatmentCount}>{treatment.count} תורים</Text>
                </View>
                <Text style={styles.treatmentRevenue}>{formatCurrency(treatment.revenue)}</Text>
              </View>
            ))}
          </View>

          {/* Barber Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ביצועי הספרים</Text>
            {stats.barberStats.map((barber, index) => (
              <View key={index} style={styles.barberRow}>
                <View style={styles.barberInfo}>
                  <Text style={styles.barberName}>{barber.name}</Text>
                  <Text style={styles.barberAppointments}>{barber.appointments} תורים</Text>
                </View>
                <Text style={styles.barberRevenue}>{formatCurrency(barber.revenue)}</Text>
              </View>
            ))}
          </View>

          {/* Refresh Button */}
          <View style={styles.refreshSection}>
            <TouchableOpacity style={styles.refreshButton} onPress={loadStatistics}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.refreshButtonText}>רענן נתונים</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.checkButton} onPress={checkAndCompleteAppointments}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.checkButtonText}>בדוק השלמת תורים</Text>
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
  header: {
    marginBottom: 24,
  },
  headerGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e3f2fd',
    textAlign: 'center',
  },
  section: {
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    textAlign: 'right',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  revenueGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
  },
  treatmentRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    textAlign: 'right',
  },
  treatmentCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  treatmentRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  barberRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  barberInfo: {
    flex: 1,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    textAlign: 'right',
  },
  barberAppointments: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  barberRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  refreshSection: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#17a2b8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  checkButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AdminStatisticsScreen; 