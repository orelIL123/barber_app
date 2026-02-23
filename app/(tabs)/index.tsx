import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import HomeScreen from '../screens/HomeScreen';

export default function HomeTab() {
  const router = useRouter();
  const { guest } = useLocalSearchParams<{ guest?: string }>();
  const isGuestMode = guest === 'true';

  const handleNavigate = (screen: string) => {
    console.log('handleNavigate called with screen:', screen);
    switch (screen) {
      case 'profile':
        router.push('/profile');
        break;
      case 'team':
        router.push('/team');
        break;
      case 'booking':
        router.push('/booking');
        break;
      case 'explore':
        router.push('/explore');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'my-appointments':
        router.push('/my-appointments');
        break;
      case 'admin-home':
        router.push('/admin-home');
        break;
      case 'admin-appointments':
        router.push('/admin-appointments');
        break;
      case 'admin-treatments':
        router.push('/admin-treatments');
        break;
      case 'admin-team':
        router.push('/admin-team');
        break;
      case 'admin-gallery':
        router.push('/admin-gallery');
        break;
      case 'admin-availability':
        router.push('/admin-availability');
        break;
      case 'admin-settings':
        router.push('/admin-settings');
        break;
      case 'auth-choice':
        console.log('Navigating to AuthChoiceScreen');
        router.push('/auth-choice');
        break;
      case 'home':
        router.replace('/(tabs)');
        break;
      default:
        console.log('Unknown screen:', screen);
        router.replace('/(tabs)');
    }
  };

  return (
    <HomeScreen onNavigate={handleNavigate} isGuestMode={isGuestMode} />
  );
}