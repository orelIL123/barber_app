import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Dimensions,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { checkIsAdmin, getCurrentUser, sendNotificationToUser } from '../../services/firebase';
import { registerPushTokenForUser } from '../../services/notifications';
import { changeLanguage } from '../i18n';

const { width } = Dimensions.get('window');

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onNotificationPress?: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ visible, onClose, onNavigate, onNotificationPress }) => {
  const { t, i18n } = useTranslation();
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [easCheckStatus, setEasCheckStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'downloading' | 'ready' | 'error'>('idle');
  const [easError, setEasError] = useState<string | null>(null);
  const [testPushStatus, setTestPushStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [testPushMessage, setTestPushMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = getCurrentUser();
      if (user) {
        const adminStatus = await checkIsAdmin(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };
    
    if (visible) {
      checkAdminStatus();
    }
  }, [visible]);
  
  const handleMenuPress = (screen: string) => {
    console.log('Menu item pressed, navigating to:', screen);
    onClose();
    setTimeout(() => {
      onNavigate(screen);
    }, 100);
  };
  
  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setShowLanguageOptions(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed');
    onClose();
    setTimeout(() => {
      onNotificationPress && onNotificationPress();
    }, 100);
  };

  const handleCheckUpdates = async () => {
    setEasError(null);
    setEasCheckStatus('checking');
    try {
      if (!Updates.isEnabled) {
        setEasCheckStatus('up-to-date');
        return;
      }
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setEasCheckStatus('downloading');
        await Updates.fetchUpdateAsync();
        setEasCheckStatus('ready');
        return;
      }
      setEasCheckStatus('up-to-date');
    } catch (_e) {
      setEasError('לא ניתן לבדוק כרגע. נסה שוב או עדכן מהחנות.');
      setEasCheckStatus('error');
    }
  };

  const handleReloadWithUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch (_e) {
      setEasError('לא ניתן להפעיל מחדש. סגור ופתח את האפליקציה.');
    }
  };

  const handleSendTestPush = async () => {
    const user = getCurrentUser();
    if (!user) {
      setTestPushMessage('יש להתחבר לחשבון');
      setTestPushStatus('error');
      return;
    }
    setTestPushStatus('sending');
    setTestPushMessage(null);
    try {
      // רענון token – חשוב אם ההרשאות הופעלו אחרי הכניסה
      await registerPushTokenForUser(user.uid);
      await new Promise((r) => setTimeout(r, 800));
      const ok = await sendNotificationToUser(user.uid, 'בדיקה 🔔', 'זו התראת בדיקה. אם קיבלת – ההתראות פעילות.');
      if (ok) {
        setTestPushStatus('sent');
        setTestPushMessage('ההתראה נשלחה. בדוק במכשיר.');
      } else {
        setTestPushStatus('error');
        setTestPushMessage('לא נשמר token. וודא שהרשאות ההתראות מופעלות בהגדרות האייפון ואז לחץ שוב.');
      }
    } catch (e: any) {
      setTestPushStatus('error');
      setTestPushMessage(e?.message || 'שליחה נכשלה. וודא הרשאות התראות ונסה שוב.');
    }
  };

  const appVersion = Constants.expoConfig?.version ?? Constants.manifest?.version ?? '—';

  const menuItems = [
    { id: 'language', title: t('settings.language'), icon: 'language', screen: null },
    { id: 'notifications', title: t('settings.notifications'), icon: 'notifications', screen: null },
    { id: 'appointments', title: t('profile.my_appointments'), icon: 'calendar-today', screen: 'my-appointments' },
    { id: 'updates', title: 'בדיקת עדכונים', icon: 'system-update', screen: null },
    { id: 'settings', title: t('nav.settings'), icon: 'settings', screen: 'settings' },
    ...(isAdmin ? [{ id: 'admin', title: t('nav.admin'), icon: 'admin-panel-settings', screen: 'admin-home' }] : []),
    { id: 'about', title: t('nav.about') || 'אודות', icon: 'info', screen: null },
  ];

  const aboutText = `ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.\n\n✂️ AI: "המספרה שלנו היא לא רק מקום להסתפר, אלא מקום להרגיש בו טוב, להירגע ולצאת עם חיוך. כל תספורת היא יצירת אמנות!"`;

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
            <Text style={styles.headerTitle}>{t('home.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.menuContent}>
            {menuItems.map((item) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    console.log('Menu item pressed:', item.title);
                    if (item.id === 'language') {
                      setShowLanguageOptions(!showLanguageOptions);
                    } else if (item.id === 'notifications') {
                      handleNotificationPress();
                    } else if (item.id === 'about') {
                      setShowAbout(true);
                    } else if (item.id === 'updates') {
                      setShowUpdatesModal(true);
                      setEasCheckStatus('idle');
                      setEasError(null);
                      setTestPushStatus('idle');
                      setTestPushMessage(null);
                    } else if (item.screen) {
                      handleMenuPress(item.screen);
                    } else {
                      console.log('No action for', item.title);
                    }
                  }}
                >
                  <MaterialIcons name={item.icon as any} size={24} color="#fff" />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  {item.id === 'language' ? (
                    <Ionicons name={showLanguageOptions ? "chevron-down" : "chevron-forward"} size={20} color="#666" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  )}
                </TouchableOpacity>
                
                {/* Language Options Submenu */}
                {item.id === 'language' && showLanguageOptions && (
                  <View style={styles.languageSubmenu}>
                    <TouchableOpacity
                      style={[styles.languageOption, i18n.language === 'he' && styles.activeLanguage]}
                      onPress={() => handleLanguageChange('he')}
                    >
                      <Text style={[styles.languageText, i18n.language === 'he' && styles.activeLanguageText]}>
                        {t('settings.hebrew')}
                      </Text>
                      {i18n.language === 'he' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.languageOption, i18n.language === 'en' && styles.activeLanguage]}
                      onPress={() => handleLanguageChange('en')}
                    >
                      <Text style={[styles.languageText, i18n.language === 'en' && styles.activeLanguageText]}>
                        {t('settings.english')}
                      </Text>
                      {i18n.language === 'en' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('common.version') || 'גרסה'} {appVersion}</Text>
            <Text style={styles.footerCredit}>{t('home.powered_by')}</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* About Modal */}
      <Modal
        visible={showAbout}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, maxWidth: 340, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>אודות</Text>
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'right', marginBottom: 24 }}>{aboutText}</Text>
            <TouchableOpacity onPress={() => setShowAbout(false)} style={{ backgroundColor: '#007bff', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Check for updates Modal - user sees only "check updates" and version, no EAS/technical info */}
      <Modal
        visible={showUpdatesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUpdatesModal(false)}
      >
        <View style={styles.updatesModalOverlay}>
          <View style={styles.updatesModalContent}>
            <View style={styles.updatesModalHeader}>
              <Text style={styles.updatesModalTitle}>בדיקת עדכונים</Text>
              <TouchableOpacity onPress={() => setShowUpdatesModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.updatesScroll}>
              <Text style={styles.updatesVersionLabel}>גרסה נוכחית</Text>
              <Text style={styles.updatesVersionValue}>{appVersion}</Text>
              {easError ? (
                <Text style={styles.updatesError}>{easError}</Text>
              ) : null}
              {easCheckStatus === 'up-to-date' && !easError && (
                <Text style={styles.updatesSuccess}>אין עדכונים כרגע. אתה מעודכן.</Text>
              )}
              {easCheckStatus === 'ready' && (
                <>
                  <Text style={styles.updatesSuccess}>מצאנו עדכון. האפליקציה תעלה מחדש.</Text>
                  <TouchableOpacity style={styles.updatesReloadButton} onPress={handleReloadWithUpdate}>
                    <Text style={styles.updatesReloadButtonText}>הפעל מחדש</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={[styles.updatesCheckButton, (easCheckStatus === 'checking' || easCheckStatus === 'downloading') && styles.updatesCheckButtonDisabled]}
                onPress={handleCheckUpdates}
                disabled={easCheckStatus === 'checking' || easCheckStatus === 'downloading'}
              >
                {easCheckStatus === 'checking' || easCheckStatus === 'downloading' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.updatesCheckButtonText}>בדוק עדכונים</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.updatesHint}>לעדכון גרסה מהחנות</Text>
              <TouchableOpacity
                style={styles.updatesStoreButton}
                onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/app/id6738223902' : 'https://play.google.com/store/apps/details?id=com.orelaharon.rontugemanbarber')}
              >
                <Text style={styles.updatesStoreButtonText}>פתח חנות</Text>
              </TouchableOpacity>
              {isAdmin && (
                <>
                  <Text style={styles.updatesHint}>בדיקת התראות (מנהל)</Text>
                  <TouchableOpacity
                    style={[styles.updatesStoreButton, testPushStatus === 'sending' && styles.updatesCheckButtonDisabled]}
                    onPress={handleSendTestPush}
                    disabled={testPushStatus === 'sending'}
                  >
                    {testPushStatus === 'sending' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.updatesStoreButtonText}>שלח התראת בדיקה</Text>
                    )}
                  </TouchableOpacity>
                  {testPushStatus === 'sent' && testPushMessage && (
                    <Text style={styles.updatesSuccess}>{testPushMessage}</Text>
                  )}
                  {testPushStatus === 'error' && testPushMessage && (
                    <Text style={styles.updatesError}>{testPushMessage}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  languageSubmenu: {
    marginTop: 8,
    marginLeft: 40,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#333',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
  },
  activeLanguage: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  languageText: {
    fontSize: 14,
    color: '#ccc',
  },
  activeLanguageText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  updatesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  updatesModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    maxHeight: '85%',
  },
  updatesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  updatesModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  updatesScroll: {
    paddingVertical: 8,
  },
  updatesVersionLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
    textAlign: 'right',
  },
  updatesVersionValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'right',
  },
  updatesHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'right',
  },
  updatesError: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'right',
  },
  updatesSuccess: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'right',
  },
  updatesStoreButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  updatesStoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  updatesCheckButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  updatesCheckButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.8,
  },
  updatesCheckButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  updatesReloadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  updatesReloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SideMenu;