import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TopNav from './components/TopNav';

export default function AdminAvailabilityPage() {
  const router = useRouter();

  console.log('AdminAvailabilityPage loaded');

  const handleNavigate = (screen: string) => {
    console.log('AdminAvailability navigating to:', screen);
    switch (screen) {
      case 'admin-home':
        router.replace('/admin-home');
        break;
      case 'admin-team':
        router.replace('/admin-team');
        break;
      case 'home':
        router.replace('/(tabs)');
        break;
      default:
        console.log('Unknown screen:', screen);
        router.replace('/admin-home');
    }
  };

  const handleBack = () => {
    console.log('AdminAvailability going back');
    router.replace('/admin-home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ניהול זמינות"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={handleBack}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>ניהול זמינות ספרים</Text>
        <Text style={styles.subtitle}>בקרוב - אפשרות לקבוע שעות עבודה לכל ספר</Text>
        
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>חזור למסך ניהול</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 100,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
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
});