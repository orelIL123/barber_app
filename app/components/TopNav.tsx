import { PlayfairDisplay_700Bold, useFonts } from '@expo-google-fonts/playfair-display';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

interface TopNavProps {
  title: string;
  onBellPress?: () => void;
  onMenuPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showCloseButton?: boolean;
  onClosePress?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ 
  title, 
  onBellPress, 
  onMenuPress, 
  showBackButton = false, 
  onBackPress, 
  showCloseButton = false, 
  onClosePress 
}) => {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <View style={styles.container}>
      {/* Diagonal blue gradient accent */}
      <LinearGradient
        colors={[colors.neonBlue, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientAccent}
        pointerEvents="none"
      />
      {/* Right edge blue accent */}
      <LinearGradient
        colors={[colors.neonBlue, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.rightAccent}
        pointerEvents="none"
      />
      
      {/* Left icon - shows back button, menu, or empty space */}
      <TouchableOpacity style={styles.iconLeft} onPress={showBackButton ? onBackPress : onMenuPress}>
        {showBackButton ? (
          <Ionicons name="arrow-back" size={28} color="#fff" />
        ) : (
          <Feather name="menu" size={28} color="#fff" />
        )}
      </TouchableOpacity>
      
      <Text style={[styles.title, { fontFamily: 'PlayfairDisplay_700Bold', textTransform: 'uppercase' }]}>{title}</Text>
      
      {/* Right icon - shows close button, notification, or empty space */}
      <TouchableOpacity style={styles.iconRight} onPress={showCloseButton ? onClosePress : onBellPress}>
        {showCloseButton ? (
          <Ionicons name="close" size={28} color="#fff" />
        ) : (
          <Ionicons name="notifications-outline" size={28} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 90,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 200,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  iconLeft: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  iconRight: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientAccent: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 100,
    height: 50,
    borderRadius: 25,
    opacity: 0.3,
    zIndex: 1,
  },
  rightAccent: {
    position: 'absolute',
    top: 20,
    right: -20,
    width: 100,
    height: 50,
    borderRadius: 25,
    opacity: 0.3,
    zIndex: 1,
  },
});

export default TopNav; 