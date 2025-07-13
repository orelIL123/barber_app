import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../app/constants/colors';

export default function TeamScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.primary]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>הצוות שלנו</Text>
            <Text style={styles.subtitle}>הכר את הספרים המקצועיים שלנו</Text>
            
            {/* Team Members */}
            <View style={styles.teamSection}>
              <View style={styles.memberCard}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>א</Text>
                </View>
                <Text style={styles.memberName}>אבי כהן</Text>
                <Text style={styles.memberRole}>ספר בכיר</Text>
                <Text style={styles.memberExperience}>10+ שנות ניסיון</Text>
              </View>
              
              <View style={styles.memberCard}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>ד</Text>
                </View>
                <Text style={styles.memberName}>דוד לוי</Text>
                <Text style={styles.memberRole}>ספר מקצועי</Text>
                <Text style={styles.memberExperience}>8+ שנות ניסיון</Text>
              </View>
              
              <View style={styles.memberCard}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>מ</Text>
                </View>
                <Text style={styles.memberName}>מיכאל רוזן</Text>
                <Text style={styles.memberRole}>ספר מתמחה</Text>
                <Text style={styles.memberExperience}>5+ שנות ניסיון</Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>למה לבחור בנו?</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>✂️</Text>
                <Text style={styles.infoText}>ספרים מקצועיים עם ניסיון רב</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>🕒</Text>
                <Text style={styles.infoText}>זמינות גבוהה וזמני תור גמישים</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>💈</Text>
                <Text style={styles.infoText}>ציוד מתקדם ומוצרים איכותיים</Text>
              </View>
            </View>
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
  content: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
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
    marginBottom: 40,
  },
  teamSection: {
    marginBottom: 40,
  },
  memberCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.neonBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textHebrew,
    marginBottom: 4,
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 14,
    color: colors.neonBlue,
    marginBottom: 4,
    textAlign: 'center',
  },
  memberExperience: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textHebrew,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textHebrew,
    flex: 1,
  },
}); 