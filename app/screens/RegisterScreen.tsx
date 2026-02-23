import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { registerUserWithPhone, sendSMSVerification } from '../../services/firebase';
import { registerPushTokenForUser } from '../../services/notifications';
import { colors } from '../constants/colors';
import { CONTACT_INFO } from '../constants/contactInfo';

const { width: screenWidth } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'verification'>('input');
  const [verificationId, setVerificationId] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  const handleSendVerification = async () => {
    if (!fullName.trim()) {
      Alert.alert('שגיאה', 'אנא הזן שם מלא');
      return;
    }
    
    if (!phone.trim()) {
      Alert.alert('שגיאה', 'אנא הזן מספר טלפון');
      return;
    }

    if (!password.trim()) {
      Alert.alert('שגיאה', 'אנא הזן סיסמה');
      return;
    }

    if (password.length < 6) {
      Alert.alert('שגיאה', 'סיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);
    try {
      const result = await sendSMSVerification(phone);
      console.log('📱 Received verificationId:', result.verificationId);
      setVerificationId(result.verificationId);
      console.log('📱 Set verificationId in state:', result.verificationId);
      setStep('verification');
      Alert.alert('הצלחה', 'קוד אימות נשלח לטלפון שלך');
    } catch (error: any) {
      console.error('SMS verification error:', error);
      Alert.alert('שגיאה', 'לא ניתן לשלוח קוד אימות');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('שגיאה', 'אנא הזן קוד אימות');
      return;
    }

    console.log('🔐 Attempting verification with:', {
      verificationId,
      verificationCode,
      verificationCodeType: typeof verificationCode,
      phone,
      fullName
    });

    setLoading(true);
    try {
      // Only call registerUserWithPhone - it will handle verification internally
      await registerUserWithPhone(phone, fullName, verificationId, verificationCode, password);

      // Register push token after successful registration (projectId + both token fields)
      try {
        const { getCurrentUser } = await import('../../services/firebase');
        const user = getCurrentUser();
        if (user) {
          await registerPushTokenForUser(user.uid);
          console.log('✅ Push token registered for new user:', user.uid);
        }
      } catch (error) {
        console.error('❌ Error registering push token:', error);
        // Don't fail registration if push registration fails
      }

      Alert.alert('הצלחה', 'נרשמת בהצלחה!', [
        { text: 'אישור', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));

      let errorMessage = 'שגיאה בהרשמה';

      if (error.message) {
        if (error.message.includes('Invalid verification code')) {
          errorMessage = 'קוד האימות שגוי. אנא נסה שוב.';
        } else if (error.message.includes('Verification ID not found')) {
          errorMessage = 'פג תוקף הקוד. אנא שלח קוד חדש.';
        } else if (error.message.includes('Verification code expired')) {
          errorMessage = 'פג תוקף הקוד. אנא שלח קוד חדש.';
        } else if (error.message.includes('email-already-in-use')) {
          errorMessage = 'כבר קיים חשבון עם מספר הטלפון הזה.';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert('שגיאה', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'verification') {
      setStep('input');
      setVerificationCode('');
    } else {
      // Navigate to auth choice screen instead of using router.back()
      // This ensures consistent navigation behavior
      router.replace('/auth-choice');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>הרשמה</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {step === 'input' ? (
          <>
            {/* Title */}
            <Text style={styles.title}>הרשמה עם מספר טלפון</Text>

            {/* Form */}
            <View style={styles.formSection}>
              <Text style={styles.label}>שם מלא</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן שם מלא"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>מספר טלפון</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן מספר טלפון"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => {
                  // Focus to password field
                }}
              />

              <Text style={styles.label}>סיסמא</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן סיסמא (לפחות 6 תווים)"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSendVerification}
              />

              <TouchableOpacity 
                style={[styles.registerButton, loading && styles.buttonDisabled]} 
                onPress={handleSendVerification}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.registerButtonText}>שלח קוד אימות</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.linkText}>יש לך חשבון? התחבר</Text>
              </TouchableOpacity>

              <Text style={styles.termsText}>
                בהמשך השימוש באפליקציה, אתה מסכים ל{' '}
                <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>תנאי השימוש</Text>
                {' '}ול{' '}
                <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>מדיניות הפרטיות</Text>
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Verification Step */}
            <Text style={styles.title}>אימות מספר טלפון</Text>
            <Text style={styles.subtitle}>
              נשלח קוד אימות ל-{phone}
            </Text>

            <View style={styles.formSection}>
              <Text style={styles.label}>קוד אימות</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן קוד אימות"
                placeholderTextColor={colors.textSecondary}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={handleVerifyAndRegister}
              />

              <TouchableOpacity 
                style={[styles.registerButton, loading && styles.buttonDisabled]} 
                onPress={handleVerifyAndRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.registerButtonText}>אמת והירשם</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms Modal */}
      <Modal visible={showTerms} transparent={true} animationType="fade" onRequestClose={() => setShowTerms(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>תנאי שימוש ומדיניות פרטיות</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                <Text style={styles.sectionTitle}>תנאי שימוש - רון תורגמן מספרה{'\n\n'}</Text>
                <Text style={styles.subsectionTitle}>1. קבלת השירות{'\n'}</Text>
                • השירות מיועד לקביעת תורים במספרה רון תורגמן{'\n'}
                • יש לספק מידע מדויק ומלא בעת קביעת התור{'\n'}
                • המספרה שומרת לעצמה את הזכות לסרב לתת שירות במקרים חריגים{'\n\n'}
                
                <Text style={styles.subsectionTitle}>2. ביטול תורים{'\n'}</Text>
                • ביטול תור יש לבצע לפחות 2 שעות לפני מועד התור{'\n'}
                • ביטול מאוחר יותר מ-2 שעות עלול לחייב תשלום{'\n'}
                • במקרה של איחור של יותר מ-15 דקות, התור עלול להתבטל{'\n\n'}
                
                <Text style={styles.subsectionTitle}>3. תשלומים{'\n'}</Text>
                • התשלום מתבצע במספרה לאחר קבלת השירות{'\n'}
                • המחירים כפי שמופיעים באפליקציה{'\n'}
                • המספרה שומרת לעצמה את הזכות לשנות מחירים{'\n\n'}
                
                <Text style={styles.subsectionTitle}>4. אחריות{'\n'}</Text>
                • המספרה מתחייבת לאיכות השירות{'\n'}
                • במקרה של אי שביעות רצון, יש לפנות למנהל המספרה{'\n'}
                • המספרה לא אחראית לנזקים עקיפים{'\n\n'}
                
                <Text style={styles.sectionTitle}>מדיניות פרטיות{'\n\n'}</Text>
                
                <Text style={styles.subsectionTitle}>1. איסוף מידע{'\n'}</Text>
                • אנו אוספים: שם מלא, מספר טלפון, פרטי תורים{'\n'}
                • המידע נאסף לצורך מתן השירות בלבד{'\n'}
                • לא נאסוף מידע מיותר{'\n\n'}
                
                <Text style={styles.subsectionTitle}>2. שימוש במידע{'\n'}</Text>
                • המידע משמש לקביעת תורים ותקשורת{'\n'}
                • לא נשתף את המידע עם צדדים שלישיים{'\n'}
                • לא נשלח הודעות פרסומיות ללא אישור{'\n\n'}
                
                <Text style={styles.subsectionTitle}>3. אבטחה{'\n'}</Text>
                • המידע מאוחסן באופן מאובטח{'\n'}
                • גישה למידע מוגבלת לעובדי המספרה בלבד{'\n'}
                • נעדכן את האבטחה לפי הצורך{'\n\n'}
                
                <Text style={styles.subsectionTitle}>4. זכויות המשתמש{'\n'}</Text>
                • הזכות לבקש עותק מהמידע שלך{'\n'}
                • הזכות לבקש מחיקה של המידע{'\n'}
                • הזכות לעדכן את המידע{'\n\n'}
                
                <Text style={styles.subsectionTitle}>5. עדכונים{'\n'}</Text>
                • מדיניות זו עשויה להתעדכן{'\n'}
                • עדכונים יפורסמו באפליקציה{'\n'}
                • המשך השימוש מהווה הסכמה לתנאים המעודכנים{'\n\n'}
                
                <Text style={styles.contactInfo}>
                  {CONTACT_INFO.contactText}{'\n'}
                  מייל: {CONTACT_INFO.email}
                </Text>
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowTerms(false)}>
              <Text style={styles.modalCloseText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: screenWidth * 0.18,
    height: screenWidth * 0.18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  formSection: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
    marginBottom: 20,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 16,
    color: colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 20,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScrollView: {
    width: '100%',
    flex: 1,
  },
  modalText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
