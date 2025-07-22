import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function WelcomeAuthScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#0a0a16', '#23234b']}
      style={styles.container}
      start={{ x: 0.2, y: 0.1 }}
      end={{ x: 0.8, y: 1 }}
    >
      <View style={styles.inner}>
        <Image
          source={require('../../assets/images/TURGI.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>ברוך הבא ל-TURGI</Text>
        <Text style={styles.subtitle}>
          הירשם בקלות עכשיו!
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/screens/AuthChoiceScreen')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>התחל הרשמה / התחברות</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: width * 0.9,
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,40,0.85)',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
    borderRadius: 60,
    backgroundColor: '#181828',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#b0b0b0',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 28,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 32,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
}); 