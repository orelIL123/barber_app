import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Appointment,
    getUserAppointments,
    getUserProfile,
    loginUser,
    logoutUser,
    makeUserAdmin,
    onAuthStateChange,
    registerUser,
    updateUserProfile,
    UserProfile,
    createUserProfileFromAuth,
    sendSMSVerification,
    verifySMSCode,
    registerUserWithPhone,
    loginWithPhone
} from '../../services/firebase';
import { RecaptchaVerifier } from 'firebase/auth';
import { NeonButton } from '../components/NeonButton';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate, onBack }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('phone'); // Default to phone
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Try to get profile, if it doesn't exist, create it
        let profile = await getUserProfile(currentUser.uid);
        if (!profile && currentUser.email) {
          await createUserProfileFromAuth(currentUser.email);
          profile = await getUserProfile(currentUser.uid);
        }
        setUserProfile(profile);
        const userAppointments = await getUserAppointments(currentUser.uid);
        setAppointments(userAppointments);
        setDisplayName(profile?.displayName || '');
        setPhone(profile?.phone || '');
      } else {
        setUserProfile(null);
        setAppointments([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleSendSMSVerification = async () => {
    if (!phone.trim()) {
      Alert.alert('שגיאה', 'נא להזין מספר טלפון');
      return;
    }
    
    setLoading(true);
    try {
      // For React Native, we need to handle reCAPTCHA differently
      const confirmationResult = await sendSMSVerification(phone, null as any);
      setConfirmationResult(confirmationResult);
      setStep('otp');
      Alert.alert('הצלחה', 'קוד אימות נשלח לטלפון שלך');
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      Alert.alert('שגיאה', 'לא ניתן לשלוח קוד אימות. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('שגיאה', 'נא להזין קוד אימות');
      return;
    }
    
    setLoading(true);
    try {
      if (tab === 'login') {
        await verifySMSCode(confirmationResult, verificationCode);
        setStep('input');
        setVerificationCode('');
        setPhone('');
      } else {
        // Register new user
        await registerUserWithPhone(phone, displayName, verificationId, verificationCode);
        setStep('input');
        setVerificationCode('');
        setPhone('');
        setDisplayName('');
        Alert.alert('הצלחה', 'המשתמש נרשם בהצלחה!');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      Alert.alert('שגיאה', 'קוד האימות שגוי או פג תוקף');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (authMethod === 'phone') {
      handleSendSMSVerification();
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('שגיאה', 'נא להזין כתובת מייל');
      return;
    }
    if (!password.trim()) {
      Alert.alert('שגיאה', 'נא להזין סיסמה');
      return;
    }
    
    setLoading(true);
    try {
      await loginUser(email, password);
      setShowLoginForm(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      let errorMessage = 'פרטי הכניסה שגויים';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'המשתמש לא נמצא במערכת';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'סיסמה שגויה';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'כתובת המייל לא תקינה';
      }
      Alert.alert('שגיאה', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם מלא');
      return;
    }
    
    if (authMethod === 'phone') {
      if (!phone.trim()) {
        Alert.alert('שגיאה', 'נא להזין מספר טלפון');
        return;
      }
      handleSendSMSVerification();
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('שגיאה', 'נא להזין כתובת מייל');
      return;
    }
    if (!password.trim()) {
      Alert.alert('שגיאה', 'נא להזין סיסמה');
      return;
    }
    if (password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להיות באורך של לפחות 6 תווים');
      return;
    }
    
    setLoading(true);
    try {
      await registerUser(email, password, displayName, phone);
      setShowRegisterForm(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setPhone('');
      Alert.alert('הצלחה', 'המשתמש נרשם בהצלחה!');
    } catch (error: any) {
      let errorMessage = 'לא ניתן ליצור חשבון';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'כתובת המייל כבר רשומה במערכת';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'הסיסמה חלשה מדי';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'כתובת המייל לא תקינה';
      }
      Alert.alert('שגיאה', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setEditMode(false);
    } catch (error: any) {
      Alert.alert('שגיאה', 'לא ניתן להתנתק');
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !userProfile) return;
    
    try {
      await updateUserProfile(user.uid, {
        ...userProfile,
        displayName,
        phone
      });
      setEditMode(false);
      Alert.alert('הצלחה', 'הפרופיל עודכן בהצלחה');
    } catch (error: any) {
      Alert.alert('שגיאה', 'לא ניתן לעדכן את הפרופיל');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'מאושר';
      case 'pending': return 'ממתין';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title="התחברות" 
          onBellPress={() => {}} 
          onMenuPress={() => {}}
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate('home'))}
        />
        <View style={styles.flexGrow}>
          {/* Top Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity onPress={() => setTab('login')} style={[styles.tab, tab === 'login' && styles.activeTab]}>
              {tab === 'login' && (
                <LinearGradient
                  colors={['#333333', '#1a1a1a', '#000000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabGradient}
                />
              )}
              <Text style={[styles.tabText, tab === 'login' && styles.activeTabText]}>התחברות</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('register')} style={[styles.tab, tab === 'register' && styles.activeTab]}>
              {tab === 'register' && (
                <LinearGradient
                  colors={['#333333', '#1a1a1a', '#000000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabGradient}
                />
              )}
              <Text style={[styles.tabText, tab === 'register' && styles.activeTabText]}>הרשמה</Text>
            </TouchableOpacity>
          </View>
          {/* White half-sheet for form */}
          <View style={styles.sheet}>
            {tab === 'login' ? (
              <View style={styles.form}>
                {/* Auth Method Selection */}
                <View style={styles.authMethodContainer}>
                  <TouchableOpacity
                    style={[styles.authMethodButton, authMethod === 'phone' && styles.activeAuthMethod]}
                    onPress={() => {
                      setAuthMethod('phone');
                      setStep('input');
                    }}
                  >
                    <Text style={[styles.authMethodText, authMethod === 'phone' && styles.activeAuthMethodText]}>
                      📱 טלפון
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.authMethodButton, authMethod === 'email' && styles.activeAuthMethod]}
                    onPress={() => {
                      setAuthMethod('email');
                      setStep('input');
                    }}
                  >
                    <Text style={[styles.authMethodText, authMethod === 'email' && styles.activeAuthMethodText]}>
                      ✉️ אימייל
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {step === 'input' ? (
                  <>
                    {authMethod === 'phone' ? (
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>מספר טלפון</Text>
                        <TextInput 
                          style={styles.input} 
                          placeholder="+972-50-123-4567" 
                          value={phone} 
                          onChangeText={setPhone} 
                          keyboardType="phone-pad" 
                        />
                      </View>
                    ) : (
                      <>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>כתובת אימייל</Text>
                          <TextInput 
                            style={styles.input} 
                            placeholder="example@email.com" 
                            value={email} 
                            onChangeText={setEmail} 
                            autoCapitalize="none" 
                            keyboardType="email-address" 
                          />
                        </View>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>סיסמה</Text>
                          <TextInput 
                            style={styles.input} 
                            placeholder="הזן סיסמה" 
                            value={password} 
                            onChangeText={setPassword} 
                            secureTextEntry 
                          />
                        </View>
                      </>
                    )}
                    <NeonButton 
                      title={authMethod === 'phone' ? 'שלח קוד אימות' : 'התחברות'} 
                      onPress={handleLogin} 
                      disabled={loading} 
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>קוד אימות (נשלח לטלפון)</Text>
                      <TextInput 
                        style={styles.input} 
                        placeholder="הזן קוד בן 6 ספרות" 
                        value={verificationCode} 
                        onChangeText={setVerificationCode} 
                        keyboardType="number-pad" 
                        maxLength={6}
                      />
                    </View>
                    <NeonButton 
                      title="אמת קוד" 
                      onPress={handleVerifyCode} 
                      disabled={loading} 
                    />
                    <TouchableOpacity 
                      style={styles.backButton} 
                      onPress={() => setStep('input')}
                    >
                      <Text style={styles.backButtonText}>חזור</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.form}>
                {/* Auth Method Selection */}
                <View style={styles.authMethodContainer}>
                  <TouchableOpacity
                    style={[styles.authMethodButton, authMethod === 'phone' && styles.activeAuthMethod]}
                    onPress={() => {
                      setAuthMethod('phone');
                      setStep('input');
                    }}
                  >
                    <Text style={[styles.authMethodText, authMethod === 'phone' && styles.activeAuthMethodText]}>
                      📱 טלפון
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.authMethodButton, authMethod === 'email' && styles.activeAuthMethod]}
                    onPress={() => {
                      setAuthMethod('email');
                      setStep('input');
                    }}
                  >
                    <Text style={[styles.authMethodText, authMethod === 'email' && styles.activeAuthMethodText]}>
                      ✉️ אימייל
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {step === 'input' ? (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>שם מלא</Text>
                      <TextInput 
                        style={styles.input} 
                        placeholder="הזן שם מלא" 
                        value={displayName} 
                        onChangeText={setDisplayName} 
                      />
                    </View>
                    
                    {authMethod === 'phone' ? (
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>מספר טלפון</Text>
                        <TextInput 
                          style={styles.input} 
                          placeholder="+972-50-123-4567" 
                          value={phone} 
                          onChangeText={setPhone} 
                          keyboardType="phone-pad" 
                        />
                      </View>
                    ) : (
                      <>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>כתובת אימייל</Text>
                          <TextInput 
                            style={styles.input} 
                            placeholder="example@email.com" 
                            value={email} 
                            onChangeText={setEmail} 
                            autoCapitalize="none" 
                            keyboardType="email-address" 
                          />
                        </View>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>מספר טלפון (אופציונלי)</Text>
                          <TextInput 
                            style={styles.input} 
                            placeholder="+972-50-123-4567" 
                            value={phone} 
                            onChangeText={setPhone} 
                            keyboardType="phone-pad" 
                          />
                        </View>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>סיסמה</Text>
                          <TextInput 
                            style={styles.input} 
                            placeholder="הזן סיסמה (לפחות 6 תווים)" 
                            value={password} 
                            onChangeText={setPassword} 
                            secureTextEntry 
                          />
                        </View>
                      </>
                    )}
                    <NeonButton 
                      title={authMethod === 'phone' ? 'שלח קוד אימות' : 'הרשמה'} 
                      onPress={handleRegister} 
                      disabled={loading} 
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>קוד אימות (נשלח לטלפון)</Text>
                      <TextInput 
                        style={styles.input} 
                        placeholder="הזן קוד בן 6 ספרות" 
                        value={verificationCode} 
                        onChangeText={setVerificationCode} 
                        keyboardType="number-pad" 
                        maxLength={6}
                      />
                    </View>
                    <NeonButton 
                      title="אמת קוד והירשם" 
                      onPress={handleVerifyCode} 
                      disabled={loading} 
                    />
                    <TouchableOpacity 
                      style={styles.backButton} 
                      onPress={() => setStep('input')}
                    >
                      <Text style={styles.backButtonText}>חזור</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="פרופיל" 
        onBellPress={() => {}} 
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('home'))}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {userProfile?.profileImage ? (
                <Image 
                  source={{ uri: userProfile.profileImage }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>👤</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={() => Alert.alert('העלאת תמונה', 'בקרוב יתאפשר להעלות תמונת פרופיל')}
            >
              <Text style={styles.editAvatarIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile?.displayName || 'משתמש'}
            </Text>
            <Text style={styles.profileEmail}>{userProfile?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(!editMode)}
          >
            <Text style={styles.editButtonText}>
              {editMode ? 'ביטול' : 'עריכה'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details */}
        <View style={styles.profileDetails}>
          <Text style={styles.sectionTitle}>פרטים אישיים</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>שם מלא:</Text>
            {editMode ? (
              <TextInput
                style={styles.detailInput}
                value={displayName}
                onChangeText={setDisplayName}
                textAlign="right"
              />
            ) : (
              <Text style={styles.detailValue}>{userProfile?.displayName}</Text>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>טלפון:</Text>
            {editMode ? (
              <TextInput
                style={styles.detailInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            ) : (
              <Text style={styles.detailValue}>{userProfile?.phone}</Text>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>אימייל:</Text>
            <Text style={styles.detailValue}>{userProfile?.email}</Text>
          </View>

          {editMode && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
            >
              <Text style={styles.saveButtonText}>שמור שינויים</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Appointments Quick View */}
        <View style={styles.appointmentsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>התורים שלי</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => {
                if (appointments.length > 0) {
                  const upcomingAppointments = appointments
                    .filter(apt => apt.status === 'confirmed' || apt.status === 'pending')
                    .slice(0, 3);
                  
                  const appointmentList = upcomingAppointments.map(apt => 
                    `• ${formatDate(apt.date)} - ${getStatusText(apt.status)}`
                  ).join('\n');
                  
                  Alert.alert(
                    'התורים הקרובים שלי',
                    appointmentList || 'אין תורים קרובים',
                    [{ text: 'סגור', style: 'default' }]
                  );
                } else {
                  Alert.alert('התורים שלי', 'אין לך תורים קיימים');
                }
              }}
            >
              <Text style={styles.viewAllText}>הצג הכל</Text>
            </TouchableOpacity>
          </View>
          
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>אין לך תורים קיימים</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => onNavigate('booking')}
              >
                <Text style={styles.bookButtonText}>הזמן תור</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.appointmentSummary}>
              <Text style={styles.appointmentSummaryText}>
                יש לך {appointments.length} תורים במערכת
              </Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => onNavigate('booking')}
              >
                <Text style={styles.bookButtonText}>הזמן תור חדש</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>


        {/* Settings Button */}
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => onNavigate('settings')}
        >
          <Text style={styles.settingsButtonText}>הגדרות</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>התנתק</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181828' },
  flexGrow: { flex: 1 },
  tabBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', marginTop: 24, marginBottom: 0, zIndex: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 16, position: 'relative' },
  activeTab: { },
  tabGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16, zIndex: -1 },
  tabText: { fontSize: 18, color: '#888', fontWeight: '600', zIndex: 1 },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, marginTop: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  form: { marginTop: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 8, 
    textAlign: 'right' 
  },
  input: { backgroundColor: '#f3f3f3', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  orText: { textAlign: 'center', color: '#aaa', marginBottom: 8, marginTop: 8 },
  errorText: { color: '#f00', textAlign: 'center', marginTop: 8 },
  successText: { color: '#0a0', textAlign: 'center', marginTop: 8 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  authContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 50,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#000',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
  },
  registerButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  registerButtonText: {
    color: '#000',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 24,
    color: '#666',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  editAvatarIcon: {
    fontSize: 12,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  profileDetails: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    textAlign: 'left',
  },
  detailValue: {
    fontSize: 16,
    color: '#222',
    flex: 2,
    textAlign: 'left',
  },
  detailInput: {
    fontSize: 16,
    color: '#222',
    flex: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'left',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  appointmentsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentSummary: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appointmentSummaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentBarber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
  },
  appointmentTreatment: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  adminButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  settingsButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButtonText: {
    color: '#666',
  },
  authMethodContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  authMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  activeAuthMethod: {
    backgroundColor: '#007bff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  authMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeAuthMethodText: {
    color: '#fff',
  },
  backButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfileScreen;