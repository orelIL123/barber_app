import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import BottomNav from './components/BottomNav';
import AdminNotificationSettingsScreen from './screens/AdminNotificationSettingsScreen';

export default function AdminNotificationSettingsTab() {
  const router = useRouter();
  const { guest } = useLocalSearchParams<{ guest?: string }>();
  const isGuestMode = guest === 'true';

  const handleNavigate = (screen: string) => {
    console.log('Admin Notification Settings navigating to:', screen);
    switch (screen) {
      case 'admin-home':
        router.replace('/admin-home');
        break;
      case 'admin-notifications':
        router.replace('/admin-notifications');
        break;
      case 'home':
        router.replace('/(tabs)');
        break;
      default:
        console.log('Unknown navigation target:', screen);
    }
  };

  const handleBack = () => {
    console.log('Admin Notification Settings back pressed');
    router.replace('/admin-settings');
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
      <AdminNotificationSettingsScreen
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