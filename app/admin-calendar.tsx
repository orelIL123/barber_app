import { useRouter } from 'expo-router';
import AdminCalendarScreen from './screens/AdminCalendarScreen';

export default function AdminCalendarTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Calendar navigating to:', screen);
    switch (screen) {
      case 'admin-home':
        router.replace('/admin-home');
        break;
      case 'admin-appointments':
        router.replace('/admin-appointments');
        break;
      default:
        router.replace('/(tabs)');
    }
  };

  const handleBack = () => {
    router.replace('/admin-home');
  };

  return (
    <AdminCalendarScreen
      onNavigate={handleNavigate}
      onBack={handleBack}
    />
  );
}
