import { Ionicons } from '@expo/vector-icons';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { checkIsAdmin, getAllUsers, getCurrentUser, sendNotificationToAllUsers } from '../../services/firebase';
import { registerPushTokenForUser } from '../../services/notifications';
import { ScissorsLoader } from '../components/ScissorsLoader';
import TopNav from '../components/TopNav';
import { colors } from '../constants/colors';
import { sendSms } from '../services/messaging/instance';

const { width } = Dimensions.get('window');

interface AdminNotificationSettingsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

interface NotificationSettings {
  newUserRegistered: boolean;
  newAppointmentBooked: boolean;
  appointmentCancelled: boolean;
  appointmentReminders: boolean;
  reminderTimings: {
    oneHourBefore: boolean;
    thirtyMinutesBefore: boolean;
    tenMinutesBefore: boolean;
    whenStarting: boolean;
  };
}

const AdminNotificationSettingsScreen: React.FC<AdminNotificationSettingsScreenProps> = ({ 
  onNavigate, 
  onBack 
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    newUserRegistered: true,
    newAppointmentBooked: true,
    appointmentCancelled: true,
    appointmentReminders: true,
    reminderTimings: {
      oneHourBefore: true,
      thirtyMinutesBefore: true,
      tenMinutesBefore: false,
      whenStarting: false,
    },
  });
  
  // New state for broadcast message
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendSMS, setSendSMS] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadSettings();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        const isAdmin = await checkIsAdmin(user.uid);
        setIsAdmin(isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('🔧 Loading admin notification settings...');
      
      // Use the centralized function from firebase.ts
      const { getAdminNotificationSettings } = await import('../../services/firebase');
      const savedSettings = await getAdminNotificationSettings();
      
      setSettings(savedSettings);
      console.log('✅ Loaded notification settings:', savedSettings);
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
      // Fallback to default settings
      const defaultSettings: NotificationSettings = {
        newUserRegistered: true,
        newAppointmentBooked: true,
        appointmentCancelled: true,
        appointmentReminders: true,
        reminderTimings: {
          oneHourBefore: true,
          thirtyMinutesBefore: true,
          tenMinutesBefore: false,
          whenStarting: false,
        },
      };
      setSettings(defaultSettings);
      console.log('✅ Using default notification settings due to error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings) => {
    try {
      const newSettings = { ...settings, [key]: !settings[key] };
      setSettings(newSettings);
      
      console.log(`🔧 Updating notification setting: ${key} = ${newSettings[key]}`);
      
      // Save to Firestore with proper error handling
      const db = getFirestore();
      
      await setDoc(doc(db, 'adminSettings', 'notifications'), {
        ...newSettings,
        updatedAt: new Date(),
        lastUpdatedBy: getCurrentUser()?.uid || 'unknown'
      }, { merge: true }); // Use merge to avoid overwriting other fields
      
      console.log('✅ Notification settings updated and saved:', newSettings);
      
      // Verify the settings were saved by reloading them
      setTimeout(async () => {
        try {
          const { getAdminNotificationSettings } = await import('../../services/firebase');
          const savedSettings = await getAdminNotificationSettings();
          console.log('🔍 Verification - loaded settings after save:', savedSettings);
        } catch (e) {
          console.error('❌ Error verifying saved settings:', e);
        }
      }, 1000);
      
      // Show success message
      Alert.alert(
        'הגדרות עודכנו',
        'הגדרות ההתראות עודכנו בהצלחה',
        [{ text: 'אישור' }]
      );
    } catch (error) {
      console.error('❌ Error updating notification settings:', error);
      Alert.alert(
        'שגיאה', 
        `לא ניתן לעדכן את ההגדרות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`
      );
    }
  };

  const handleReminderToggle = async (timing: keyof typeof settings.reminderTimings) => {
    try {
      const newReminderTimings = { ...settings.reminderTimings, [timing]: !settings.reminderTimings[timing] };
      const newSettings = { ...settings, reminderTimings: newReminderTimings };
      setSettings(newSettings);
      
      console.log(`🔧 Updating reminder timing: ${timing} = ${newReminderTimings[timing]}`);
      
      // Save to Firestore with proper error handling
      const db = getFirestore();
      
      await setDoc(doc(db, 'adminSettings', 'notifications'), {
        ...newSettings,
        updatedAt: new Date(),
        lastUpdatedBy: getCurrentUser()?.uid || 'unknown'
      }, { merge: true }); // Use merge to avoid overwriting other fields
      
      console.log('✅ Reminder timing settings updated and saved:', newReminderTimings);
      
      // Verify the settings were saved by reloading them
      setTimeout(async () => {
        try {
          const { getAdminNotificationSettings } = await import('../../services/firebase');
          const savedSettings = await getAdminNotificationSettings();
          console.log('🔍 Verification - loaded reminder settings after save:', savedSettings.reminderTimings);
        } catch (e) {
          console.error('❌ Error verifying saved reminder settings:', e);
        }
      }, 1000);
      
      // Show success message
      Alert.alert(
        'הגדרות תזכורות עודכנו',
        'הגדרות התזכורות עודכנו בהצלחה',
        [{ text: 'אישור' }]
      );
    } catch (error) {
      console.error('❌ Error updating reminder settings:', error);
      Alert.alert(
        'שגיאה', 
        `לא ניתן לעדכן את הגדרות התזכורות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`
      );
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onNavigate('admin-home');
    }
  };

  const handleRefreshPushToken = async () => {
    const user = getCurrentUser();
    if (!user) return;
    setRefreshingToken(true);
    try {
      await registerPushTokenForUser(user.uid);
      Alert.alert('הצלחה', 'Token ההתראות עודכן. התראות אמורות להגיע עכשיו.');
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'לא הצלחנו לרענן. וודא הרשאות התראות מופעלות.');
    } finally {
      setRefreshingToken(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    try {
      setSendingBroadcast(true);
      
      // Send push notification
      const sentCount = await sendNotificationToAllUsers(broadcastTitle, broadcastMessage);
      
      let message = `הודעה נשלחה ל-${sentCount} משתמשים`;
      
      // If SMS is enabled, send SMS as well
      if (sendSMS) {
        try {
          const users = await getAllUsers();
          const nonAdminUsersWithPhone = users.filter(user => !user.isAdmin && user.phone);
          
          console.log(`📱 Found ${nonAdminUsersWithPhone.length} non-admin users with phone numbers`);
          
          const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
          const DELAY_BETWEEN_SMS = 2000; // 2 sec - למניעת rate limiting ב-SMS4Free
          
          let smsSentCount = 0;
          for (let i = 0; i < nonAdminUsersWithPhone.length; i++) {
            const user = nonAdminUsersWithPhone[i];
            try {
              let phoneNumber = user.phone!.replace(/\D/g, '').replace(/^972/, '0');
              if (!phoneNumber.startsWith('0')) phoneNumber = '0' + phoneNumber;
              
              const smsMessage = `${broadcastTitle}\n${broadcastMessage}`;
              const shortMessage = smsMessage.length > 70 ? smsMessage.substring(0, 67) + '...' : smsMessage;
              
              const result = await sendSms(phoneNumber, shortMessage);
              if (result.success) smsSentCount++;
              else console.error(`SMS failed for ${user.phone}:`, result.error);
              
              if (i < nonAdminUsersWithPhone.length - 1) await delay(DELAY_BETWEEN_SMS);
            } catch (error) {
              console.error(`Failed to send SMS to ${user.phone}:`, error);
              await delay(DELAY_BETWEEN_SMS);
            }
          }
          
          message += ` (כולל ${smsSentCount} SMS)`;
        } catch (error) {
          console.error('Error sending SMS:', error);
          message += ' (SMS נכשל)';
        }
      }
      
      Alert.alert('הצלחה', message);
      
      // Reset form
      setBroadcastTitle('');
      setBroadcastMessage('');
      setSendSMS(false);
      setShowBroadcastModal(false);
      
    } catch (error) {
      console.error('Error sending broadcast:', error);
      Alert.alert('שגיאה', 'שגיאה בשליחת ההודעה');
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ScissorsLoader size={60} color="#007bff" accessibilityLabel="טוען" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color="#dc3545" />
          <Text style={styles.errorText}>אין לך הרשאות מנהל</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
            <Text style={styles.backButtonText}>חזור לעמוד הבית</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav
        title="הגדרות התראות"
        onBackPress={handleBack}
        showBackButton={true}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>התראות מנהל</Text>
          <Text style={styles.sectionSubtitle}>
            בחר איזה התראות תרצה לקבל כמנהל
          </Text>
        </View>

        {/* New User Registration */}
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={24} color="#4CAF50" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>משתמש חדש נרשם</Text>
              <Text style={styles.settingDescription}>
                קבל התראה כשמשתמש חדש נרשם לאפליקציה
              </Text>
            </View>
          </View>
          <Switch
            value={settings.newUserRegistered}
            onValueChange={() => handleToggle('newUserRegistered')}
            trackColor={{ false: '#ddd', true: '#4CAF50' }}
            thumbColor={settings.newUserRegistered ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* New Appointment Booked */}
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar" size={24} color="#2196F3" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>תור חדש נקבע</Text>
              <Text style={styles.settingDescription}>
                קבל התראה כשמשתמש קובע תור חדש
              </Text>
            </View>
          </View>
          <Switch
            value={settings.newAppointmentBooked}
            onValueChange={() => handleToggle('newAppointmentBooked')}
            trackColor={{ false: '#ddd', true: '#2196F3' }}
            thumbColor={settings.newAppointmentBooked ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Appointment Cancelled */}
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>תור בוטל</Text>
              <Text style={styles.settingDescription}>
                קבל התראה כשמשתמש מבטל תור
              </Text>
            </View>
          </View>
          <Switch
            value={settings.appointmentCancelled}
            onValueChange={() => handleToggle('appointmentCancelled')}
            trackColor={{ false: '#ddd', true: '#F44336' }}
            thumbColor={settings.appointmentCancelled ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Appointment Reminders */}
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="alarm" size={24} color="#FF9800" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>תזכורות לתורים</Text>
              <Text style={styles.settingDescription}>
                קבל תזכורות על תורים קרובים (שעה ורבע שעה לפני)
              </Text>
            </View>
          </View>
          <Switch
            value={settings.appointmentReminders}
            onValueChange={() => handleToggle('appointmentReminders')}
            trackColor={{ false: '#ddd', true: '#FF9800' }}
            thumbColor={settings.appointmentReminders ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Reminder Timings Section */}
        {settings.appointmentReminders && (
          <View style={styles.reminderTimingsSection}>
            <View style={styles.reminderHeader}>
              <Ionicons name="time" size={20} color="#FF9800" />
              <Text style={styles.reminderTitle}>זמני תזכורות</Text>
            </View>
            <Text style={styles.reminderDescription}>
              בחר מתי בדיוק תרצה לקבל תזכורות על תורים
            </Text>

            {/* 1 Hour Before */}
            <View style={styles.reminderItem}>
              <View style={styles.reminderLeft}>
                <Ionicons name="hourglass" size={20} color="#4CAF50" />
                <Text style={styles.reminderText}>שעה לפני התור</Text>
              </View>
              <Switch
                value={settings.reminderTimings.oneHourBefore}
                onValueChange={() => handleReminderToggle('oneHourBefore')}
                trackColor={{ false: '#ddd', true: '#4CAF50' }}
                thumbColor={settings.reminderTimings.oneHourBefore ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* 30 Minutes Before */}
            <View style={styles.reminderItem}>
              <View style={styles.reminderLeft}>
                <Ionicons name="time" size={20} color="#2196F3" />
                <Text style={styles.reminderText}>30 דקות לפני התור</Text>
              </View>
              <Switch
                value={settings.reminderTimings.thirtyMinutesBefore}
                onValueChange={() => handleReminderToggle('thirtyMinutesBefore')}
                trackColor={{ false: '#ddd', true: '#2196F3' }}
                thumbColor={settings.reminderTimings.thirtyMinutesBefore ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* 10 Minutes Before */}
            <View style={styles.reminderItem}>
              <View style={styles.reminderLeft}>
                <Ionicons name="timer" size={20} color="#FF9800" />
                <Text style={styles.reminderText}>10 דקות לפני התור</Text>
              </View>
              <Switch
                value={settings.reminderTimings.tenMinutesBefore}
                onValueChange={() => handleReminderToggle('tenMinutesBefore')}
                trackColor={{ false: '#ddd', true: '#FF9800' }}
                thumbColor={settings.reminderTimings.tenMinutesBefore ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* When Starting */}
            <View style={styles.reminderItem}>
              <View style={styles.reminderLeft}>
                <Ionicons name="play" size={20} color="#F44336" />
                <Text style={styles.reminderText}>כשהתור מתחיל</Text>
              </View>
              <Switch
                value={settings.reminderTimings.whenStarting}
                onValueChange={() => handleReminderToggle('whenStarting')}
                trackColor={{ false: '#ddd', true: '#F44336' }}
                thumbColor={settings.reminderTimings.whenStarting ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Refresh Token Section - for admin */}
        <View style={styles.broadcastSection}>
          <View style={styles.broadcastHeader}>
            <Ionicons name="refresh-circle" size={24} color="#007bff" />
            <Text style={styles.broadcastTitle}>רענן Token התראות</Text>
          </View>
          <Text style={styles.broadcastDescription}>
            אם לא מקבלים התראות – לחץ כדי לרענן את ה-Token. חשוב אם הרשאות ההתראות הופעלו אחרי הכניסה.
          </Text>
          <TouchableOpacity
            style={[styles.refreshTokenButton, refreshingToken && styles.refreshTokenDisabled]}
            onPress={handleRefreshPushToken}
            disabled={refreshingToken}
          >
            {refreshingToken ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="refresh" size={20} color="#fff" />
            )}
            <Text style={styles.broadcastButtonText}>{refreshingToken ? 'מרענן...' : 'רענן Token שלי'}</Text>
          </TouchableOpacity>
        </View>

        {/* Broadcast Message Section */}
        <View style={styles.broadcastSection}>
          <View style={styles.broadcastHeader}>
            <Ionicons name="megaphone" size={24} color="#007bff" />
            <Text style={styles.broadcastTitle}>שליחת הודעה לכל המשתמשים</Text>
          </View>
          <Text style={styles.broadcastDescription}>
            שלח הודעה לכל המשתמשים כ-Push Notification{'\n'}
            נשלח רק למשתמשים שאישרו התראות (יש להם Push Token)
          </Text>
          <TouchableOpacity 
            style={styles.broadcastButton}
            onPress={() => setShowBroadcastModal(true)}
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.broadcastButtonText}>שלח הודעה</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.infoTitle}>מידע חשוב</Text>
          </View>
          <Text style={styles.infoText}>
            • ההתראות יישלחו לך כ-Push Notifications{'\n'}
            • תוכל לשנות הגדרות אלה בכל עת{'\n'}
            • ההתראות יישלחו רק למנהלים{'\n'}
            • תזכורות התורים יישלחו אוטומטית
          </Text>
        </View>
      </ScrollView>

      {/* Broadcast Message Modal */}
      <Modal
        visible={showBroadcastModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>שליחת הודעה לכל המשתמשים</Text>
              <TouchableOpacity onPress={() => setShowBroadcastModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>כותרת ההודעה</Text>
              <TextInput
                style={styles.textInput}
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
                placeholder="הזן כותרת להודעה"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>תוכן ההודעה</Text>
              <TextInput
                style={[styles.textInput, styles.messageInput]}
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
                placeholder="הזן את תוכן ההודעה"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />

              <View style={styles.smsOption}>
                <TouchableOpacity 
                  style={styles.smsToggle}
                  onPress={() => setSendSMS(!sendSMS)}
                >
                  <View style={[styles.checkbox, sendSMS && styles.checkboxChecked]}>
                    {sendSMS && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.smsLabel}>שלח גם כ-SMS</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBroadcastModal(false)}
                disabled={sendingBroadcast}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleSendBroadcast}
                disabled={sendingBroadcast}
              >
                <Text style={styles.sendButtonText}>
                  {sendingBroadcast ? 'שולח...' : 'שלח הודעה'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: colors.text,
    fontFamily: 'Heebo-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: 'Heebo-Regular',
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Heebo-Medium',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    color: colors.text,
    fontFamily: 'Heebo-Bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Heebo-Regular',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Heebo-Medium',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Heebo-Regular',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Heebo-Medium',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Heebo-Regular',
    lineHeight: 20,
  },
  // Broadcast section styles
  broadcastSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  broadcastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    fontFamily: 'Heebo-Medium',
  },
  broadcastDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'Heebo-Regular',
  },
  broadcastButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  broadcastButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Heebo-Medium',
  },
  refreshTokenButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  refreshTokenDisabled: {
    opacity: 0.7,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Heebo-Medium',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
    fontFamily: 'Heebo-Medium',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'right',
    fontFamily: 'Heebo-Regular',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  smsOption: {
    marginTop: 16,
  },
  smsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  smsLabel: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Heebo-Regular',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sendButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Heebo-Medium',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Heebo-Medium',
  },
  // Reminder timings styles
  reminderTimingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    fontFamily: 'Heebo-Medium',
  },
  reminderDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'Heebo-Regular',
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontFamily: 'Heebo-Regular',
  },
});

export default AdminNotificationSettingsScreen;