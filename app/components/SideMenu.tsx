import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onNotificationPress?: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ visible, onClose, onNavigate, onNotificationPress }) => {
  const handleMenuPress = (screen: string) => {
    console.log('Menu item pressed, navigating to:', screen);
    onClose();
    setTimeout(() => {
      onNavigate(screen);
    }, 100);
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed');
    onClose();
    setTimeout(() => {
      onNotificationPress && onNotificationPress();
    }, 100);
  };

  const menuItems = [
    { id: 'language', title: 'שפה', icon: 'language', screen: 'settings' },
    { id: 'notifications', title: 'התראות', icon: 'notifications', screen: null },
    { id: 'appointments', title: 'התורים שלך', icon: 'calendar-today', screen: 'profile' },
    { id: 'settings', title: 'הגדרות', icon: 'settings', screen: 'settings' },
    { id: 'admin', title: 'פאנל מנהל', icon: 'admin-panel-settings', screen: 'admin-home' },
    { id: 'about', title: 'אודות', icon: 'info', screen: null },
  ];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
        <SafeAreaView style={styles.menuContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>TURGI</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.menuContent}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  console.log('Menu item pressed:', item.title);
                  if (item.id === 'notifications') {
                    handleNotificationPress();
                  } else if (item.screen) {
                    handleMenuPress(item.screen);
                  } else {
                    console.log('No action for', item.title);
                  }
                }}
              >
                <MaterialIcons name={item.icon as any} size={24} color="#fff" />
                <Text style={styles.menuItemText}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>גרסה 1.0.0</Text>
            <Text style={styles.footerCredit}>Powered by Orel Aharon</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  overlayTouch: {
    flex: 1,
  },
  menuContainer: {
    width: width * 0.8,
    backgroundColor: '#1a1a1a',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  closeButton: {
    padding: 8,
  },
  menuContent: {
    flex: 1,
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
    marginRight: 16,
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  footerCredit: {
    fontSize: 12,
    color: '#888',
  },
});

export default SideMenu;