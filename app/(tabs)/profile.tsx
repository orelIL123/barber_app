import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../app/constants/colors';
import TopNav from '../components/TopNav';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleClose = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="פרופיל" 
        onBellPress={() => {}} 
        onMenuPress={() => {}} 
        showBackButton={true}
        onBackPress={handleBack}
        showCloseButton={true}
        onClosePress={handleClose}
      />
      <LinearGradient
        colors={[colors.background, colors.primary]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.title}>פרופיל</Text>
          <Text style={styles.subtitle}>מסך פרופיל - בקרוב</Text>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 120, // מרווח לטאב התחתון
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textHebrew,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 