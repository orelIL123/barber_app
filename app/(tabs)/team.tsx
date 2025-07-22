import React from 'react';
import TeamScreenComponent from '../screens/TeamScreen';
import { useRouter } from 'expo-router';

export default function TeamTab() {
  const router = useRouter();

  const handleNavigate = (screen: string, params?: any) => {
    switch (screen) {
      case 'home':
        router.replace('/(tabs)');
        break;
      case 'profile':
        router.replace('/profile');
        break;
      case 'booking':
        if (params) {
          router.push({
            pathname: '/booking',
            params
          });
        } else {
          router.replace('/booking');
        }
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
    <TeamScreenComponent 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
} 