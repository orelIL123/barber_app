import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../app/constants/colors';
import TopNav from '../components/TopNav';

export default function HomeScreen() {
  const [userName, setUserName] = useState('אוראל');
  const [nextAppointment, setNextAppointment] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title="TURGI" onBellPress={() => {}} onMenuPress={() => {}} />
      <LinearGradient
        colors={[colors.background, colors.primary]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>שלום {userName} 👋</Text>
            <Text style={styles.subtitle}>מוכן לתספורת חדשה?</Text>
          </View>

          {/* Main CTA Button */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.mainButton}>
              <LinearGradient
                colors={[colors.neonBlue, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>הזמן תור</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Next Appointment */}
          {nextAppointment ? (
            <View style={styles.appointmentCard}>
              <Text style={styles.appointmentTitle}>התור הבא שלך</Text>
              <Text style={styles.appointmentTime}>{nextAppointment}</Text>
            </View>
          ) : (
            <View style={styles.noAppointmentCard}>
              <Text style={styles.noAppointmentTitle}>אין תור קרוב</Text>
              <Text style={styles.noAppointmentText}>
                רוצה להצטרף לרשימת המתנה?
              </Text>
              <TouchableOpacity style={styles.waitlistButton}>
                <Text style={styles.waitlistButtonText}>הצטרף לרשימת המתנה</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>התורים שלי</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>הספרים שלנו</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

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
    paddingBottom: 120, // מרווח לטאב התחתון
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textHebrew,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ctaSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  mainButton: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.neonBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neonGreen,
  },
  appointmentTitle: {
    color: colors.textHebrew,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  appointmentTime: {
    color: colors.neonGreen,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  noAppointmentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  noAppointmentTitle: {
    color: colors.textHebrew,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noAppointmentText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  waitlistButton: {
    backgroundColor: colors.neonPurple,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  waitlistButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionButtonText: {
    color: colors.textHebrew,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
