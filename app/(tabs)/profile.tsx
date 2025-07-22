import React from 'react';
import ProfileScreen from '../screens/ProfileScreen';
import { useRouter } from 'expo-router';

export default function ProfileTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.replace('/(tabs)');
        break;
      case 'team':
        router.replace('/team');
        break;
      case 'booking':
        router.replace('/booking');
        break;
      case 'explore':
        router.replace('/explore');
        break;
      default:
        router.replace('/');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ProfileScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
} 