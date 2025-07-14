import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  TextInput,
  Dimensions
} from 'react-native';
import { 
  getCurrentUser, 
  getUserProfile, 
  updateUserProfile, 
  loginUser, 
  registerUser, 
  logoutUser, 
  onAuthStateChange,
  UserProfile,
  getUserAppointments,
  Appointment
} from '../../services/firebase';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
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

  const handleLogin = async () => {
    try {
      await loginUser(email, password);
      setShowLoginForm(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      Alert.alert('שגיאה', 'פרטי הכניסה שגויים');
    }
  };

  const handleRegister = async () => {
    try {
      await registerUser(email, password, displayName, phone);
      setShowRegisterForm(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setPhone('');
    } catch (error: any) {
      Alert.alert('שגיאה', 'לא ניתן ליצור חשבון');
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
        <TopNav title="פרופיל" onBellPress={() => {}} onMenuPress={() => {}} />
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.authContainer}>
            <Text style={styles.welcomeText}>ברוכים הבאים ל-TURGI</Text>
            <Text style={styles.subtitleText}>התחברו כדי לנהל את התורים שלכם</Text>
            
            <TouchableOpacity
              style={styles.authButton}
              onPress={() => setShowLoginForm(true)}
            >
              <Text style={styles.authButtonText}>התחברות</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.authButton, styles.registerButton]}
              onPress={() => setShowRegisterForm(true)}
            >
              <Text style={[styles.authButtonText, styles.registerButtonText]}>הרשמה</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Login Modal */}
        {showLoginForm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>התחברות</Text>
              <TextInput
                style={styles.input}
                placeholder="אימייל"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="סיסמה"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="right"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButton} onPress={handleLogin}>
                  <Text style={styles.modalButtonText}>התחבר</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowLoginForm(false)}
                >
                  <Text style={styles.cancelButtonText}>ביטול</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Register Modal */}
        {showRegisterForm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>הרשמה</Text>
              <TextInput
                style={styles.input}
                placeholder="שם מלא"
                value={displayName}
                onChangeText={setDisplayName}
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="אימייל"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="טלפון"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="סיסמה"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="right"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButton} onPress={handleRegister}>
                  <Text style={styles.modalButtonText}>הירשם</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowRegisterForm(false)}
                >
                  <Text style={styles.cancelButtonText}>ביטול</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title="פרופיל" onBellPress={() => {}} onMenuPress={() => {}} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
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

        {/* Appointments */}
        <View style={styles.appointmentsSection}>
          <Text style={styles.sectionTitle}>התורים שלי</Text>
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
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentDate}>
                    {formatDate(appointment.date)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(appointment.status) }
                  ]}>
                    <Text style={styles.statusText}>
                      {getStatusText(appointment.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.appointmentBarber}>
                  ספר: {appointment.barberId}
                </Text>
                <Text style={styles.appointmentTreatment}>
                  טיפול: {appointment.treatmentId}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>התנתק</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    color: '#666',
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
    textAlign: 'right',
  },
  detailValue: {
    fontSize: 16,
    color: '#222',
    flex: 2,
    textAlign: 'right',
  },
  detailInput: {
    fontSize: 16,
    color: '#222',
    flex: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'right',
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
  input: {
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
});

export default ProfileScreen;