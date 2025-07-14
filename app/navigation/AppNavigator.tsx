import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TeamScreen from '../screens/TeamScreen';
import BookingScreen from '../screens/BookingScreen';

export type Screen = 'home' | 'profile' | 'team' | 'booking';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [navigationParams, setNavigationParams] = useState<any>({});

  const handleNavigate = (screen: Screen, params?: any) => {
    setCurrentScreen(screen);
    setNavigationParams(params || {});
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfileScreen onNavigate={handleNavigate} />;
      case 'team':
        return <TeamScreen onNavigate={handleNavigate} />;
      case 'booking':
        return <BookingScreen onNavigate={handleNavigate} route={{ params: navigationParams }} />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppNavigator;