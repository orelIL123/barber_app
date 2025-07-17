import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BookingScreen from '../screens/BookingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TeamScreen from '../screens/TeamScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import AdminAppointmentsScreen from '../screens/AdminAppointmentsScreen';
import AdminTreatmentsScreen from '../screens/AdminTreatmentsScreen';
import AdminTeamScreen from '../screens/AdminTeamScreen';
import AdminGalleryScreen from '../screens/AdminGalleryScreen';

export type Screen = 'home' | 'profile' | 'team' | 'booking' | 'settings' | 'admin-home' | 'admin-appointments' | 'admin-treatments' | 'admin-team' | 'admin-gallery';

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
        return <ProfileScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('home')}
        />;
      case 'team':
        return <TeamScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('home')}
        />;
      case 'booking':
        return <BookingScreen 
          onNavigate={handleNavigate} 
          route={{ params: navigationParams }}
          onBack={() => handleNavigate('home')}
          onClose={() => handleNavigate('home')}
        />;
      case 'settings':
        return <SettingsScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('home')}
        />;
      case 'admin-home':
        return <AdminHomeScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('home')}
        />;
      case 'admin-appointments':
        return <AdminAppointmentsScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('admin-home')}
        />;
      case 'admin-treatments':
        return <AdminTreatmentsScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('admin-home')}
        />;
      case 'admin-team':
        return <AdminTeamScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('admin-home')}
        />;
      case 'admin-gallery':
        return <AdminGalleryScreen 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('admin-home')}
        />;
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