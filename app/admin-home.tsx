import React from 'react';
import AdminHomeScreen from './screens/AdminHomeScreen';
import { useRouter } from 'expo-router';

export default function AdminHomeTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Home navigating to:', screen);
    switch (screen) {
      case 'home':
        router.replace('/');
        break;
      case 'admin-appointments':
        router.replace('/admin-appointments');
        break;
      case 'admin-treatments':
        router.replace('/admin-treatments');
        break;
      case 'admin-team':
        router.replace('/admin-team');
        break;
      case 'admin-gallery':
        router.replace('/admin-gallery');
        break;
      case 'settings':
        router.replace('/settings');
        break;
      default:
        router.replace('/');
    }
  };

  const handleBack = () => {
    router.replace('/');
  };

  return (
    <AdminHomeScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}