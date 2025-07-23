import { Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { useColorScheme } from '../../hooks/useColorScheme';
import BottomNav from '../components/BottomNav';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  // קביעת הטאב הפעיל לפי ה־route
  const activeTab = React.useMemo(() => {
    const last = segments[segments.length - 1];
    if (String(last) === 'index') return 'home';
    if (String(last) === 'profile') return 'profile';
    if (String(last) === 'settings') return 'settings';
    return 'home';
  }, [segments]);

  // ניווט בין טאבים
  const handleTabPress = (tab: string) => {
    if (tab === 'home') router.replace('/(tabs)');
    else if (tab === 'profile') router.replace('/profile');
    else if (tab === 'settings') router.replace('/(tabs)/settings');
  };

  // ניווט מהיר מה־FAB - מנתב לספר בוקינג
  const handleOrderPress = () => {
    router.push('/booking');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'בית' }} />
        <Tabs.Screen name="profile" options={{ title: 'פרופיל' }} />
        <Tabs.Screen name="settings" options={{ title: 'הגדרות' }} />
        <Tabs.Screen name="booking" options={{ title: 'הזמנה' }} />
      </Tabs>
      <BottomNav
        onOrderPress={handleOrderPress}
        onTabPress={handleTabPress}
        activeTab={activeTab}
      />
    </>
  );
}
