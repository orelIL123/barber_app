import React from 'react';
import BookingScreen from '../screens/BookingScreen';
import { useRouter } from 'expo-router';

export default function BookingTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.replace('/');
        break;
      case 'profile':
        router.replace('/profile');
        break;
      case 'team':
        router.replace('/team');
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
      router.replace('/');
    }
  };

  const handleClose = () => {
    router.replace('/');
  };

  return (
    <BookingScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
      onClose={handleClose}
    />
  );
}