import React from 'react';
import { useRouter } from 'expo-router';
import AdminAvailabilityScreen from './screens/AdminAvailabilityScreen';

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
        router.replace('/');
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

  try {
    return (
      <AdminAvailabilityScreen 
        onNavigate={handleNavigate}
        onBack={handleBack}
      />
    );
  } catch (error) {
    console.error('Error loading AdminAvailabilityScreen:', error);
    router.replace('/admin-home');
    return null;
  }
}