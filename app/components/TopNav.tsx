import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

interface TopNavProps {
  title: string;
  onBellPress?: () => void;
  onMenuPress?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ title, onBellPress, onMenuPress }) => {
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
      <TouchableOpacity style={styles.iconLeft} onPress={onMenuPress}>
        <Feather name="menu" size={28} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.iconRight} onPress={onBellPress}>
        <Ionicons name="notifications-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 64,
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 200,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  iconLeft: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iconRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gradientAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 120,
    height: 64,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 64,
    opacity: 0.45,
    zIndex: 1,
    transform: [{ rotate: '-12deg' }],
  },
  rightAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 64,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    opacity: 0.7,
    zIndex: 2,
  },
});

export default TopNav; 