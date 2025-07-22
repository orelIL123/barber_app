import React from 'react';
import SettingsScreen from './screens/SettingsScreen';
import { useRouter } from 'expo-router';

export default function SettingsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Settings navigating to:', screen);
    switch (screen) {
      case 'home':
        router.replace('/(tabs)');
        break;
      case 'profile':
        router.replace('/profile');
        break;
      case 'team':
        router.replace('/team');
        break;
      case 'booking':
        router.replace('/booking');
        break;
      case 'admin-home':
        router.replace('/admin-home');
        break;
      default:
        router.replace('/');
    }
  };

  const handleBack = () => {
    router.replace('/(tabs)');
  };

  return (
    <SettingsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}