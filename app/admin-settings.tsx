import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import BottomNav from './components/BottomNav';
import AdminSettingsScreen from './screens/AdminSettingsScreen';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { guest } = useLocalSearchParams<{ guest?: string }>();
  const isGuestMode = guest === 'true';

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'admin-home':
        router.replace('/admin-home');
        break;
      case 'home':
        router.replace('/(tabs)');
        break;
      default:
        router.replace('/admin-home');
    }
  };

  const handleBack = () => {
    router.replace('/admin-home');
  };

  const handleTabPress = (tab: string) => {
    if (tab === 'home') router.replace('/(tabs)');
    else if (tab === 'profile') {
      if (isGuestMode) router.push('/auth-choice');
      else router.replace('/(tabs)/profile');
    } else if (tab === 'shop') router.replace('/(tabs)/explore');
    else if (tab === 'settings') router.replace('/(tabs)/settings');
  };

  const handleOrderPress = () => router.push('/booking');

  return (
    <View style={{ flex: 1 }}>
      <AdminSettingsScreen
        onNavigate={handleNavigate}
        onBack={handleBack}
      />
      <BottomNav
        onOrderPress={handleOrderPress}
        onTabPress={handleTabPress}
        activeTab="settings"
      />
    </View>
  );
}