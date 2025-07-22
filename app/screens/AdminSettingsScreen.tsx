import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface AdminSettingsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminSettingsScreen: React.FC<AdminSettingsScreenProps> = ({ onNavigate, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  
  // Settings states
  const [welcomeMessage, setWelcomeMessage] = useState('שלום, ברוכים הבאים');
  const [subtitleMessage, setSubtitleMessage] = useState('ל-TURGI ברברשופ');
  const [aboutUsText, setAboutUsText] = useState('ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.');
  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load welcome messages
      const welcomeDoc = await getDoc(doc(db, 'settings', 'homeMessages'));
      if (welcomeDoc.exists()) {
        const data = welcomeDoc.data();
        setWelcomeMessage(data.welcome || 'שלום, ברוכים הבאים');
        setSubtitleMessage(data.subtitle || 'ל-TURGI ברברשופ');
      } else {
        // Create default if doesn't exist
        await setDoc(doc(db, 'settings', 'homeMessages'), {
          welcome: 'שלום, ברוכים הבאים',
          subtitle: 'ל-TURGI ברברשופ',
          createdAt: new Date()
        });
      }

      // Load about us text
      const aboutDoc = await getDoc(doc(db, 'settings', 'aboutUsText'));
      if (aboutDoc.exists()) {
        const data = aboutDoc.data();
        setAboutUsText(data.text || '');
      } else {
        // Create default if doesn't exist
        const defaultAboutText = 'ברוכים הבאים למספרה של רון תורג׳מן! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רון, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.';
        await setDoc(doc(db, 'settings', 'aboutUsText'), {
          text: defaultAboutText,
          createdAt: new Date()
        });
        setAboutUsText(defaultAboutText);
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('שגיאה בטעינת ההגדרות', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveWelcomeMessages = async () => {
    try {
      setLoading(true);
      await setDoc(doc(db, 'settings', 'homeMessages'), {
        welcome: welcomeMessage,
        subtitle: subtitleMessage,
        updatedAt: new Date()
      });
      showToast('הודעות הברכה עודכנו בהצלחה!');
    } catch (error) {
      console.error('Error saving welcome messages:', error);
      showToast('שגיאה בשמירת ההודעות', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveAboutUsText = async () => {
    try {
      setLoading(true);
      await setDoc(doc(db, 'settings', 'aboutUsText'), {
        text: aboutUsText,
        updatedAt: new Date()
      });
      showToast('טקסט אודותינו עודכן בהצלחה!');
    } catch (error) {
      console.error('Error saving about us text:', error);
      showToast('שגיאה בשמירת הטקסט', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendPopupMessage = async () => {
    if (!popupMessage.trim()) {
      Alert.alert('שגיאה', 'נא להזין הודעה');
      return;
    }

    try {
      setLoading(true);
      await setDoc(doc(db, 'settings', 'popupMessage'), {
        message: popupMessage,
        isActive: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      setPopupMessage('');
      showToast('ההודעה נשלחה לכל המשתמשים!');
    } catch (error) {
      console.error('Error sending popup message:', error);
      showToast('שגיאה בשליחת ההודעה', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearPopupMessage = async () => {
    try {
      setLoading(true);
      await setDoc(doc(db, 'settings', 'popupMessage'), {
        message: '',
        isActive: false,
        clearedAt: new Date()
      });
      showToast('ההודעה הוסרה מכל המשתמשים');
    } catch (error) {
      console.error('Error clearing popup message:', error);
      showToast('שגיאה בהסרת ההודעה', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="הגדרות מנהל" 
        onBellPress={() => {}} 
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Welcome Messages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הודעות ברכה בעמוד הבית</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>הודעת ברכה ראשית</Text>
            <TextInput
              style={styles.textInput}
              value={welcomeMessage}
              onChangeText={setWelcomeMessage}
              placeholder="שלום, ברוכים הבאים"
              textAlign="right"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>כותרת משנה</Text>
            <TextInput
              style={styles.textInput}
              value={subtitleMessage}
              onChangeText={setSubtitleMessage}
              placeholder="ל-TURGI ברברשופ"
              textAlign="right"
              multiline
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveWelcomeMessages}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>שמור הודעות ברכה</Text>
          </TouchableOpacity>
        </View>

        {/* About Us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>טקסט אודותינו</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>תוכן הטקסט</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={aboutUsText}
              onChangeText={setAboutUsText}
              placeholder="טקסט אודותינו..."
              textAlign="right"
              multiline
              numberOfLines={8}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveAboutUsText}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>שמור טקסט אודותינו</Text>
          </TouchableOpacity>
        </View>

        {/* Popup Message Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>שליחת הודעה לכל המשתמשים</Text>
          <Text style={styles.sectionDescription}>
            ההודעה תופיע כחלונית קופצת לכל המשתמשים במשך 24 שעות
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>תוכן ההודעה</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={popupMessage}
              onChangeText={setPopupMessage}
              placeholder="הזן הודעה למשתמשים..."
              textAlign="right"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={sendPopupMessage}
              disabled={loading}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.buttonText}>שלח הודעה</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={clearPopupMessage}
              disabled={loading}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>הסר הודעה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'right',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'right',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sendButton: {
    backgroundColor: '#007bff',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#dc3545',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminSettingsScreen;