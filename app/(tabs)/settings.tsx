import { useRouter } from 'expo-router';
import SettingsScreen from '../screens/SettingsScreen';

export default function SettingsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.replace('/(tabs)');
        break;
      case 'profile':
        router.replace('/(tabs)/profile');
        break;
      case 'team':
        router.replace('/team');
        break;
      case 'booking':
        router.push('/booking');
        break;
      case 'admin-home':
        router.replace('/admin-home');
        break;
      default:
        router.replace('/(tabs)');
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
