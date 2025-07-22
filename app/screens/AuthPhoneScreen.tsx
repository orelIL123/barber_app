// Recaptcha removed - using ProfileScreen for auth instead
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ConfirmationResult, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, collections, db } from '../config/firebase';

export default function AuthPhoneScreen() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const router = useRouter();
  // const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isRegister = mode === 'register';

  // פורמט מספר ישראלי ל-+9725XXXXXXXX
  const formatPhone = (num: string) => {
    let digits = num.replace(/\D/g, '');
    if (digits.startsWith('972')) {
      digits = '0' + digits.slice(3);
    }
    if (digits.startsWith('05') && digits.length === 10) {
      return '+972' + digits.slice(1);
    }
    return null;
  };

  // בדוק אם המשתמש כבר מחובר
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ודא שהמשתמש קיים ב-Firestore
        const userRef = doc(db, collections.users, user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          // צור משתמש חדש ב-Firestore
          await setDoc(userRef, {
            uid: user.uid,
            name: isRegister ? name : '',
            phone: user.phoneNumber || '',
            email: user.email || '',
            createdAt: new Date(),
            type: 'client',
          });
        }
        // נווט למסך הבית
        router.replace('/');
      }
      setCheckingAuth(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegister, name]);

  // שליחת SMS
  const sendCode = async () => {
    if (isRegister && !name.trim()) {
      Alert.alert('שם מלא נדרש', 'יש להזין שם מלא לצורך הרשמה');
      return;
    }
    const formatted = formatPhone(phone);
    if (!formatted) {
      Alert.alert('מספר לא תקין', 'יש להזין מספר ישראלי תקין בפורמט 05XXXXXXXX');
      return;
    }
    setLoading(true);
    try {
      // const confirmation = await signInWithPhoneNumber(auth, formatted, recaptchaVerifier.current as any);
      throw new Error('SMS auth temporarily disabled - use ProfileScreen instead');
      setConfirm(confirmation);
      Alert.alert('קוד נשלח!', 'הזן את הקוד שקיבלת ב-SMS');
    } catch (error: any) {
      Alert.alert('שגיאה', error.message);
    } finally {
      setLoading(false);
    }
  };

  // אימות קוד
  const verifyCode = async () => {
    if (!code || code.length < 4) {
      Alert.alert('קוד לא תקין', 'יש להזין קוד בן 4 ספרות לפחות');
      return;
    }
    setLoading(true);
    try {
      if (confirm) {
        await confirm.confirm(code);
        // onAuthStateChanged יטפל בניווט ושמירה
      }
    } catch (error: any) {
      Alert.alert('קוד שגוי', error.message);
    } finally {
      setLoading(false);
    }
  };

  // התחברות/הרשמה עם אימייל
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('שגיאה', 'יש להזין אימייל וסיסמה');
      return;
    }
    if (isRegister && !name.trim()) {
      Alert.alert('שם מלא נדרש', 'יש להזין שם מלא לצורך הרשמה');
      return;
    }
    setLoading(true);
    try {
      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // צור משתמש חדש ב-Firestore
        const user = userCredential.user;
        const userRef = doc(db, collections.users, user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          name,
          email: user.email,
          phone: '',
          createdAt: new Date(),
          type: 'client',
        });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // onAuthStateChanged יטפל בניווט
    } catch (error: any) {
      Alert.alert('שגיאה', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={32}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <TouchableOpacity
            style={[styles.methodBtn, authMethod === 'phone' && styles.methodBtnActive]}
            onPress={() => setAuthMethod('phone')}
          >
            <Text style={[styles.methodBtnText, authMethod === 'phone' && styles.methodBtnTextActive]}>טלפון</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodBtn, authMethod === 'email' && styles.methodBtnActive]}
            onPress={() => setAuthMethod('email')}
          >
            <Text style={[styles.methodBtnText, authMethod === 'email' && styles.methodBtnTextActive]}>אימייל</Text>
          </TouchableOpacity>
        </View>
        {/* <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={auth.app.options}
        /> */}
        <Text style={styles.title}>{isRegister ? (authMethod === 'email' ? 'הרשמה עם אימייל' : 'הרשמה עם SMS') : (authMethod === 'email' ? 'התחברות עם אימייל' : 'התחברות עם SMS')}</Text>
        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="שם מלא"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={40}
          />
        )}
        {authMethod === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="מספר טלפון ישראלי (05...)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={20}
            />
            <TouchableOpacity style={styles.button} onPress={sendCode} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'שולח...' : isRegister ? 'שלח קוד הרשמה' : 'שלח קוד התחברות'}</Text>
            </TouchableOpacity>
            {confirm && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="קוד אימות"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={loading}>
                  <Text style={styles.buttonText}>{loading ? 'מאמת...' : isRegister ? 'אמת קוד והרשם' : 'אמת קוד'}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="אימייל"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={40}
            />
            <TextInput
              style={styles.input}
              placeholder="סיסמה"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={40}
            />
            <TouchableOpacity style={styles.button} onPress={handleEmailAuth} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? (isRegister ? 'נרשם...' : 'מתחבר...') : isRegister ? 'הרשם' : 'התחבר'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#fff' },
  button: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, marginBottom: 12, width: '100%' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  methodBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8, marginHorizontal: 4, backgroundColor: '#fff' },
  methodBtnActive: { backgroundColor: '#3b82f6' },
  methodBtnText: { color: '#3b82f6', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  methodBtnTextActive: { color: '#fff' },
}); 