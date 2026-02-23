import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { authManager } from '../../services/authManager';
import { callUpdateEmailAndSendReset, checkUserExistsForPasswordReset, loginUser, loginWithPhoneAndPassword, sendResetEmail } from '../../services/firebase';
import { registerPushTokenForUser } from '../../services/notifications';
import { colors } from '../constants/colors';
import { CONTACT_INFO } from '../constants/contactInfo';
import { sendSms } from '../services/messaging/instance';

const { width: screenWidth } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot password states
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showSmsVerification, setShowSmsVerification] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [foundUserId, setFoundUserId] = useState('');
  const [foundUserPhone, setFoundUserPhone] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Load saved credentials on component mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        console.log('🔄 LoginScreen: Loading saved credentials...');
        const savedCredentials = await authManager.getSavedCredentials();

        if (savedCredentials) {
          if (savedCredentials.email) {
            setEmailOrPhone(savedCredentials.email);
            console.log('✅ LoginScreen: Loaded saved email:', savedCredentials.email);
          } else if (savedCredentials.phoneNumber) {
            setEmailOrPhone(savedCredentials.phoneNumber);
            console.log('✅ LoginScreen: Loaded saved phone:', savedCredentials.phoneNumber);
          }

          // Load saved password if available
          if (savedCredentials.password) {
            setPassword(savedCredentials.password);
            console.log('✅ LoginScreen: Loaded saved password');
          }

          // Set remember me if credentials were saved
          if (savedCredentials.rememberMe) {
            setRememberMe(true);
            console.log('✅ LoginScreen: Remember Me enabled');
          }

          console.log('✅ LoginScreen: Loaded saved credentials successfully');
        } else {
          console.log('ℹ️ LoginScreen: No saved credentials found');
        }
      } catch (error) {
        console.error('❌ LoginScreen: Error loading saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('שגיאה', 'אנא הזן אימייל או מספר טלפון');
      return;
    }

    if (!password.trim()) {
      Alert.alert('שגיאה', 'אנא הזן סיסמה');
      return;
    }

    setLoading(true);
    try {
      // Check if it's email or phone format
      const isEmail = emailOrPhone.includes('@');
      console.log(`🔍 LoginScreen: Input "${emailOrPhone}" detected as ${isEmail ? 'EMAIL' : 'PHONE'}`);

      // CRITICAL FIX: Normalize phone number format before saving/login
      let normalizedInput = emailOrPhone;
      if (!isEmail) {
        // Remove all non-digit characters from phone
        const cleanPhone = emailOrPhone.replace(/[^0-9]/g, '');
        // Normalize to +972 format
        if (cleanPhone.startsWith('0')) {
          normalizedInput = `+972${cleanPhone.substring(1)}`;
        } else if (cleanPhone.startsWith('972')) {
          normalizedInput = `+${cleanPhone}`;
        } else {
          normalizedInput = `+972${cleanPhone}`;
        }
        console.log(`📱 LoginScreen: Normalized phone from "${emailOrPhone}" to "${normalizedInput}"`);
      }

      // Save credentials using AuthManager if "remember me" is checked
      if (rememberMe) {
        try {
          console.log('💾 LoginScreen: Saving credentials...');
          await authManager.saveLoginCredentials(
            isEmail ? normalizedInput : undefined,
            isEmail ? undefined : normalizedInput,
            password,
            true
          );
          console.log('✅ LoginScreen: Credentials saved successfully');
        } catch (error) {
          console.error('❌ LoginScreen: Error saving credentials:', error);
        }
      }

      if (isEmail) {
        console.log('🔐 LoginScreen: Attempting email login with:', normalizedInput);
        await loginUser(normalizedInput, password);
      } else {
        console.log('📱 LoginScreen: Attempting phone login with:', normalizedInput);
        await loginWithPhoneAndPassword(normalizedInput, password);
      }

      // Register for push notifications after successful login (projectId + both token fields)
      try {
        const user = authManager.getCurrentUser();
        if (user) {
          await registerPushTokenForUser(user.uid);
          console.log('✅ LoginScreen: Push token registered for user:', user.uid);
        }
      } catch (error) {
        console.error('❌ LoginScreen: Error registering push token:', error);
        // Don't fail login if push registration fails
      }

      Alert.alert('הצלחה', 'התחברת בהצלחה', [
        { text: 'אישור', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));

      let errorMessage = 'פרטי הכניסה שגויים';
      let errorTitle = 'שגיאה';

      if (error.message.includes('משתמש לא נמצא במערכת')) {
        errorTitle = 'משתמש לא קיים';
        errorMessage = 'לא נמצא חשבון עם הפרטים שהזנת.\nאנא הירשם תחילה.';
      } else if (error.message.includes('משתמש לא נמצא')) {
        errorTitle = 'משתמש לא קיים';
        errorMessage = 'לא נמצא חשבון עם הפרטים שהזנת.\nאנא הירשם תחילה.';
      } else if (error.message.includes('auth/user-not-found')) {
        errorTitle = 'משתמש לא קיים';
        errorMessage = 'לא נמצא חשבון עם הפרטים שהזנת.\nאנא הירשם תחילה.';
      } else if (error.message.includes('סיסמה שגויה') || error.message.includes('auth/wrong-password')) {
        errorTitle = 'סיסמה שגויה';
        errorMessage = 'הסיסמה שגויה. אנא נסה שוב.';
      } else if (error.message.includes('auth/invalid-credential')) {
        errorTitle = 'פרטי כניסה שגויים';
        errorMessage = 'שם משתמש או סיסמה שגויים.\nאנא בדוק את הפרטים ונסה שוב.';
      } else if (error.message.includes('פרטי הכניסה שגויים')) {
        errorTitle = 'פרטי כניסה שגויים';
        errorMessage = 'שם משתמש או סיסמה שגויים.\nאנא בדוק את הפרטים ונסה שוב.';
      } else if (error.message.includes('לא הוגדרה סיסמה')) {
        errorTitle = 'אין סיסמה לחשבון';
        errorMessage = 'לא הוגדרה סיסמה לחשבון זה.\nאנא הירשם מחדש.';
      } else if (error.message.includes('auth/invalid-email')) {
        errorTitle = 'אימייל לא תקין';
        errorMessage = 'האימייל שהזנת אינו תקין.\nאנא בדוק ונסה שוב.';
      } else if (error.message.includes('auth/too-many-requests')) {
        errorTitle = 'יותר מדי ניסיונות';
        errorMessage = 'חשבון זה נחסם זמנית עקב ניסיונות כניסה כושלים רבים.\nאנא נסה שוב מאוחר יותר.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error(`❌ Showing error to user: ${errorTitle} - ${errorMessage}`);

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleForgotPassword = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('שכחת סיסמה?', 'אנא הזן את מספר הטלפון שלך בשדה למעלה ואז לחץ על "שכחתי סיסמה".');
      return;
    }

    // Check if the input is a phone number
    const isEmail = emailOrPhone.includes('@');
    if (isEmail) {
      Alert.alert('איפוס סיסמה', 'אנא הזן את מספר הטלפון שלך לצורך אימות ב-SMS.');
      return;
    }

    setResettingPassword(true);
    try {
      const userExists = await checkUserExistsForPasswordReset(emailOrPhone);
      if (!userExists.exists) {
        Alert.alert(
          'משתמש לא נמצא',
          'לא נמצא משתמש עם מספר הטלפון הזה. אנא בדוק את המספר או הירשם מחדש.',
          [{ text: 'אישור', onPress: () => {} }]
        );
        setResettingPassword(false);
        return;
      }

      // User exists - generate and send SMS verification code
      const code = generateVerificationCode();
      setExpectedCode(code);
      setFoundUserId(userExists.userId || '');

      // Format phone number for SMS
      let phoneToSend = emailOrPhone.trim();
      const cleanPhone = phoneToSend.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        phoneToSend = '+972' + cleanPhone.substring(1);
      } else if (!phoneToSend.startsWith('+')) {
        phoneToSend = '+972' + cleanPhone;
      } else {
        phoneToSend = '+' + cleanPhone;
      }
      
      setFoundUserPhone(phoneToSend);

      // Send SMS with verification code
      const smsResult = await sendSms(phoneToSend, `קוד אימות לאיפוס סיסמה למספרת רון תורגמן: ${code}`);
      
      if (smsResult.success) {
        setShowSmsVerification(true);
      } else {
        Alert.alert('שגיאה', 'לא הצלחנו לשלוח קוד אימות ב-SMS. אנא נסה שוב או פנה לתמיכה.');
      }
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      Alert.alert('שגיאה', error?.message || 'אירעה שגיאה. אנא נסה שוב מאוחר יותר.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleVerifySmsCode = () => {
    if (!smsCode.trim()) {
      Alert.alert('שגיאה', 'אנא הזן את קוד האימות');
      return;
    }

    if (smsCode.trim() !== expectedCode) {
      Alert.alert('שגיאה', 'קוד האימות שגוי. אנא נסה שוב.');
      return;
    }

    setShowSmsVerification(false);
    setShowEmailInput(true);
    setSmsCode('');
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      Alert.alert('שגיאה', 'אנא הזן כתובת אימייל תקינה');
      return;
    }

    setResettingPassword(true);
    try {
      // Step 1: Call Cloud Function to update user email
      console.log(`🔄 Calling Cloud Function to update email for user ${foundUserId} to ${resetEmail}`);
      await callUpdateEmailAndSendReset(foundUserId, resetEmail.trim().toLowerCase());
      
      // Step 2: Send password reset email from client
      console.log(`📧 Sending password reset email to ${resetEmail}`);
      await sendResetEmail(resetEmail.trim().toLowerCase());

      Alert.alert(
        'הודעת איפוס בדרך 📧',
        `קישור לאיפוס סיסמה נשלח לכתובת ${resetEmail}. אנא בדוק את תיבת הדואר הנכנס שלך (גם בתיקיית הספאם).`,
        [{ 
          text: 'אישור', 
          onPress: () => {
            setShowEmailInput(false);
            setResetEmail('');
          } 
        }]
      );
    } catch (error: any) {
      console.error('❌ Reset email error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח את לינק האיפוס. אנא וודא שהאימייל תקין ונסה שוב.');
    } finally {
      setResettingPassword(false);
    }
  };


  const handleBack = () => {
    // Navigate to auth choice screen instead of using router.back()
    // This ensures consistent navigation behavior
    router.replace('/auth-choice');
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
          <Text style={styles.headerTitle}>התחברות</Text>
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

            {/* Title */}
            <Text style={styles.title}>התחברות עם אימייל או טלפון</Text>

            {/* Form */}
            <View style={styles.formSection}>
              <Text style={styles.label}>אימייל או מספר טלפון</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן אימייל או מספר טלפון"
                placeholderTextColor={colors.textSecondary}
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                keyboardType="default"
                autoCapitalize="none"
              />

              <Text style={styles.label}>סיסמא</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן סיסמא"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Remember Me Checkbox */}
              <View style={styles.rememberMeContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    console.log('🔄 Remember me toggled:', !rememberMe);
                    setRememberMe(!rememberMe);
                  }}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.rememberMeText}>זכור אותי</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>התחבר</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} style={{ marginBottom: 10 }}>
                {resettingPassword ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.forgotPasswordText}>שכחתי סיסמה?</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.linkText}>אין לך חשבון? הירשם</Text>
              </TouchableOpacity>

              <Text style={styles.termsText}>
                בהמשך השימוש באפליקציה, אתה מסכים ל{' '}
                <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>תנאי השימוש</Text>
                {' '}ול{' '}
                <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>מדיניות הפרטיות</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SMS Verification Modal */}
      <Modal visible={showSmsVerification} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>אימות ב-SMS</Text>
            <Text style={styles.modalText}>
              שלחנו קוד אימות לנייד המסתיים ב-*{foundUserPhone.slice(-4)}. אנא הזן אותו למטה:
            </Text>
            <TextInput
              style={styles.input}
              placeholder="6 ספרות"
              value={smsCode}
              onChangeText={setSmsCode}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleVerifySmsCode}
            >
              <Text style={styles.loginButtonText}>אמת קוד</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowSmsVerification(false)}
              style={{ marginTop: 10 }}
            >
              <Text style={[styles.linkText, { color: '#666' }]}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Input Modal */}
      <Modal visible={showEmailInput} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>איפוס סיסמה</Text>
            <Text style={styles.modalText}>
              הקוד אומת בהצלחה!{'\n'}כעת, הזן את כתובת האימייל שלך לקבלת לינק לאיפוס סיסמה:
            </Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
            <TouchableOpacity 
              style={[styles.loginButton, resettingPassword && styles.buttonDisabled]} 
              onPress={handleSendResetEmail}
              disabled={resettingPassword}
            >
              {resettingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>שלח לינק לאיפוס</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowEmailInput(false)}
              style={{ marginTop: 10 }}
            >
              <Text style={[styles.linkText, { color: '#666' }]}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal visible={showTerms} transparent={true} animationType="fade" onRequestClose={() => setShowTerms(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>תנאי שימוש ומדיניות פרטיות</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                <Text style={styles.sectionTitle}>תנאי שימוש - רון תורגמן מספרה{'\n\n'}</Text>

                <Text style={styles.subsectionTitle}>1. קבלת השירות{'\n'}</Text>
                • השירות מיועד לקביעת תורים במספרה של רון תורגמן{'\n'}
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
    width: screenWidth * 0.25,
    height: screenWidth * 0.25,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
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
  loginButton: {
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
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 16,
    color: colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
  termsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  // Remember Me Checkbox Styles
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  rememberMeText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    marginLeft: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});