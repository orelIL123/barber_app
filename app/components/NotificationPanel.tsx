import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getCurrentUser, getUserNotifications, markNotificationAsRead } from '../../services/firebase';

interface NotificationItem {
  id: string;
  type: 'appointment' | 'general' | 'reminder';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ visible, onClose }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailNotification, setDetailNotification] = useState<NotificationItem | null>(null);

  const loadNotifications = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getUserNotifications(user.uid);
      setNotifications(list);
    } catch (e) {
      console.error('Error loading notifications:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadNotifications();
  }, [visible, loadNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return 'calendar';
      case 'reminder': return 'alarm';
      case 'general':
      default: return 'megaphone';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment': return '#007bff';
      case 'reminder': return '#FF9800';
      case 'general':
      default: return '#28a745';
    }
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    setDetailNotification(notification);
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (e) {
        console.error('Error marking as read:', e);
      }
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      try {
        await markNotificationAsRead(n.id);
      } catch (_) {}
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>התראות</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>טוען התראות...</Text>
              </View>
            ) : (
              <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="notifications-off" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>אין התראות חדשות</Text>
                    <Text style={styles.emptySubtext}>הודעות מתורג'י יופיעו כאן (נמחקות אחרי 24 שעות)</Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <Pressable
                      key={notification.id}
                      style={({ pressed }) => [
                        styles.notificationItem,
                        !notification.isRead && styles.unreadNotification,
                        pressed && styles.notificationItemPressed,
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                    >
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationHeader}>
                          <View style={styles.notificationLeft}>
                            <Ionicons
                              name={getNotificationIcon(notification.type) as any}
                              size={22}
                              color={getNotificationColor(notification.type)}
                            />
                            <Text style={styles.notificationTitle} numberOfLines={1}>
                              {notification.title}
                            </Text>
                          </View>
                          <Text style={styles.notificationTime}>{notification.time}</Text>
                        </View>
                        <Text style={styles.notificationMessage} numberOfLines={2}>
                          {notification.message}
                        </Text>
                      </View>
                      {!notification.isRead && <View style={styles.unreadDot} />}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}

            {!loading && notifications.length > 0 && notifications.some(n => !n.isRead) && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.markAllReadButton}
                  onPress={markAllAsRead}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  <Text style={styles.markAllReadText}>סמן הכל כנקרא</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Detail modal when user taps a notification */}
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
                      name={getNotificationIcon(detailNotification.type) as any}
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
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  closeButton: {
    padding: 4,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  notificationItemPressed: {
    opacity: 0.92,
    backgroundColor: '#eef1f4',
  },
  unreadNotification: {
    backgroundColor: '#e8f4fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  notificationContent: {
    flex: 1,
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
    fontWeight: '600',
    color: '#222',
    marginLeft: 10,
    textAlign: 'right',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    textAlign: 'right',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
    position: 'absolute',
    top: 16,
    right: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  markAllReadButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  markAllReadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

export default NotificationPanel;
