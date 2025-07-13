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
    if (String(last) === 'explore') return 'shop';
    if (String(last) === 'team') return 'team';
    return 'home';
  }, [segments]);

  // ניווט בין טאבים
  const handleTabPress = (tab: string) => {
    if (tab === 'home') router.replace('/');
    else if (tab === 'profile') router.replace('/profile');
    else if (tab === 'shop') router.replace('/explore');
    else if (tab === 'team') router.replace('/team');
  };

  // ניווט מהיר מה־FAB (אפשר להחליף ל־explore או לכל מסך אחר קיים)
  const handleOrderPress = () => {
    router.replace('/explore');
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
        <Tabs.Screen name="explore" options={{ title: 'חנות' }} />
        <Tabs.Screen name="team" options={{ title: 'צוות' }} />
      </Tabs>
      <BottomNav
        onOrderPress={handleOrderPress}
        onTabPress={handleTabPress}
        activeTab={activeTab}
      />
    </>
  );
}
