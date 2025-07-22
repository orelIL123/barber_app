import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AuthChoiceScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/TURGI.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>ברוך הבא!</Text>
      <Text style={styles.subtitle}>בחר פעולה:</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace({ pathname: '/screens/AuthPhoneScreen', params: { mode: 'login' } })}
      >
        <Text style={styles.buttonText}>התחברות</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#6366f1' }]}
        onPress={() => router.replace({ pathname: '/screens/AuthPhoneScreen', params: { mode: 'register' } })}
      >
        <Text style={styles.buttonText}>הרשמה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a16', padding: 24 },
  logo: { width: 100, height: 100, marginBottom: 32, borderRadius: 50, backgroundColor: '#181828' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#b0b0b0', marginBottom: 24, textAlign: 'center' },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 32,
    marginBottom: 16,
    width: 220,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
}); 