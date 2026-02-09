import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    clearAllUserNotifications,
    getCurrentUser,
    getUserNotifications,
    markNotificationAsRead
} from '../../services/firebase';
import { ScissorsLoader } from '../components/ScissorsLoader';
import TopNav from '../components/TopNav';

interface NotificationsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

interface Notification {
  id: string;
  type: 'appointment' | 'general' | 'reminder';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onNavigate, onBack }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appointmentNotifications, setAppointmentNotifications] = useState(true);
  const [generalNotifications, setGeneralNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();
      if (user) {
        const userNotifications = await getUserNotifications(user.uid);
        setNotifications(userNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'calendar';
      case 'reminder':
        return 'alarm';
      case 'general':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return '#007bff';
      case 'reminder':
        return '#FF9800';
      case 'general':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    setDetailNotification(notification);
    if (!notification.isRead) await markAsRead(notification.id);
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'מחק הודעות',
      'האם אתה בטוח שברצונך למחוק את כל ההודעות?',
      [
        { text: 'ביטול', style: 'cancel' },
        { 
          text: 'מחק הכל', 
          style: 'destructive',
          onPress: async () => {
            try {
              const user = getCurrentUser();
              if (user) {
                await clearAllUserNotifications(user.uid);
                setNotifications([]);
              }
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('שגיאה', 'לא ניתן למחוק את ההודעות');
            }
          }
        }
      ]
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="התראות" 
        onBellPress={() => {}} 
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('home'))}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Notification Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>הגדרות התראות</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="calendar" size={20} color="#007bff" style={styles.settingIcon} />
                <Text style={styles.settingText}>התראות לתורים</Text>
              </View>
              <Switch
                value={appointmentNotifications}
                onValueChange={setAppointmentNotifications}
                trackColor={{ false: '#ddd', true: '#007bff' }}
                thumbColor={appointmentNotifications ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="megaphone" size={20} color="#4CAF50" style={styles.settingIcon} />
                <Text style={styles.settingText}>הודעות כלליות</Text>
              </View>
              <Switch
                value={generalNotifications}
                onValueChange={setGeneralNotifications}
                trackColor={{ false: '#ddd', true: '#4CAF50' }}
                thumbColor={generalNotifications ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Notifications Header */}
          <View style={styles.notificationsHeader}>
            <Text style={styles.sectionTitle}>
              הודעות ({unreadCount} חדשות)
            </Text>
            {notifications.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearAllNotifications}
              >
                <Text style={styles.clearButtonText}>מחק הכל</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notifications List */}
          {loading ? (
            <View style={styles.emptyState}>
              <ScissorsLoader size={60} color="#007bff" accessibilityLabel="טוען הודעות" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>אין הודעות חדשות</Text>
              <Text style={styles.emptyStateSubtext}>כל ההודעות שלך יופיעו כאן</Text>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {notifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  style={({ pressed }) => [
                    styles.notificationCard,
                    !notification.isRead && styles.unreadNotification,
                    pressed && styles.notificationCardPressed,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <View style={styles.notificationLeft}>
                        <Ionicons 
                          name={getNotificationIcon(notification.type)} 
                          size={22} 
                          color={getNotificationColor(notification.type)} 
                        />
                        <Text style={styles.notificationTitle} numberOfLines={1}>
                          {notification.title}
                        </Text>
                      </View>
                      <Text style={styles.notificationTime}>
                        {notification.time}
                      </Text>
                    </View>
                    
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    
                    {!notification.isRead && (
                      <View style={styles.unreadIndicator} />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Detail modal when tapping a notification */}
          <Modal
            animationType="fade"
            transparent
            visible={!!detailNotification}
            onRequestClose={() => setDetailNotification(null)}
          >
            <Pressable style={styles.detailOverlay} onPress={() => setDetailNotification(null)}>
              <Pressable style={styles.detailCard} onPress={e => e.stopPropagation()}>
                {detailNotification && (
                  <>
                    <View style={styles.detailHeader}>
                      <View style={styles.detailIconWrap}>
                        <Ionicons
                          name={getNotificationIcon(detailNotification.type)}
                          size={28}
                          color={getNotificationColor(detailNotification.type)}
                        />
                      </View>
                      <Text style={styles.detailTitle}>{detailNotification.title}</Text>
                      <Text style={styles.detailTime}>{detailNotification.time}</Text>
                    </View>
                    <Text style={styles.detailMessage}>{detailNotification.message}</Text>
                    <TouchableOpacity
                      style={styles.detailCloseButton}
                      onPress={() => setDetailNotification(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.detailCloseText}>סגור</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Pressable>
            </Pressable>
          </Modal>

          {/* Notification Schedule Info */}
          <View style={styles.infoSection}>
            <LinearGradient
              colors={['#007bff', '#0056b3']}
              style={styles.infoGradient}
            >
              <Ionicons name="information-circle" size={24} color="#fff" />
              <Text style={styles.infoTitle}>מערכת התראות</Text>
              <Text style={styles.infoText}>
                • תזכורת ראשונה: שעה לפני התור{'\n'}
                • תזכורת שנייה: 10 דקות לפני התור{'\n'}
                • הודעות מהספר: הודעות כלליות ועדכונים
              </Text>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  notificationsList: {
    marginBottom: 16,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  notificationCardPressed: {
    opacity: 0.92,
    backgroundColor: '#f5f7fa',
  },
  notificationContent: {
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 8,
    textAlign: 'right',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    textAlign: 'right',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
  },
  infoSection: {
    marginTop: 16,
  },
  infoGradient: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  detailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    textAlign: 'right',
  },
  detailTime: {
    fontSize: 13,
    color: '#888',
  },
  detailMessage: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    textAlign: 'right',
    marginBottom: 20,
  },
  detailCloseButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationsScreen;