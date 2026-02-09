import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Appointment,
    Barber,
    deleteAppointment,
    getAllUsers,
    getAppointmentsByDateRange,
    getBarbers,
    getTreatments,
    Treatment,
    updateAppointment,
    UserProfile
} from '../../services/firebase';
import { ScissorsLoader } from '../components/ScissorsLoader';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AdminCalendarScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminCalendarScreen: React.FC<AdminCalendarScreenProps> = ({ onNavigate, onBack }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  const loadData = async () => {
    try {
      setLoading(true);

      const startDate = new Date(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 7);

      const [appointmentsData, barbersData, usersData, treatmentsData] = await Promise.all([
        getAppointmentsByDateRange(startDate, endDate),
        getBarbers(),
        getAllUsers(),
        getTreatments()
      ]);

      setAppointments(appointmentsData);
      setBarbers(barbersData);
      setUsers(usersData);
      setTreatments(treatmentsData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      showToast('שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'מאושר';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  const getBarberName = (barberId: string) => {
    const barber = barbers.find(b => b.id === barberId);
    return barber ? barber.name : 'לא נמצא';
  };

  const getUserName = (appointment: any) => {
    if (appointment.isManualClient && appointment.clientName) {
      return appointment.clientName;
    }
    const user = users.find(u => u.uid === appointment.userId);
    return user ? user.displayName : 'לא נמצא';
  };

  const getUserPhone = (appointment: any) => {
    if (appointment.isManualClient && appointment.clientPhone) {
      return appointment.clientPhone;
    }
    const user = users.find(u => u.uid === appointment.userId);
    return user ? user.phone : null;
  };

  const handlePhoneCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('שגיאה', 'מספר טלפון לא זמין');
      return;
    }

    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');

    Linking.openURL(`tel:${cleanedNumber}`).catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את אפליקציית הטלפון');
    });
  };

  const getTreatmentName = (treatmentId: string) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    return treatment ? treatment.name : 'לא נמצא';
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus as any });
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId ? { ...apt, status: newStatus as any } : apt
        )
      );
      showToast('הסטטוס עודכן בהצלחה');
      setModalVisible(false);
    } catch (error) {
      showToast('שגיאה בעדכון הסטטוס', 'error');
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    Alert.alert(
      'מחיקת תור',
      'האם אתה בטוח שברצונך למחוק תור זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(appointmentId);
              setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
              showToast('התור נמחק בהצלחה');
              setModalVisible(false);
            } catch (error) {
              showToast('שגיאה במחיקת התור', 'error');
            }
          }
        }
      ]
    );
  };

  // Generate week days
  const generateWeekDays = () => {
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  const weekDays = generateWeekDays();

  // Get appointments for a specific day and hour
  const getAppointmentsForSlot = (date: Date, hour: number) => {
    const dateString = date.toDateString();
    return appointments.filter(apt => {
      const aptDate = apt.date.toDate ? apt.date.toDate() : new Date(apt.date);
      return aptDate.toDateString() === dateString && aptDate.getHours() === hour;
    }).sort((a, b) => {
      const aTime = a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
      const bTime = b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
      return aTime - bTime;
    });
  };

  const previousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const nextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    return `${currentWeekStart.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  };

  // Calculate appointment position and height
  const getAppointmentStyle = (apt: Appointment) => {
    const aptDate = apt.date.toDate ? apt.date.toDate() : new Date(apt.date);
    const minutes = aptDate.getMinutes();
    const duration = apt.duration || 30;

    const HOUR_HEIGHT = 80; // Must match hourRow height in styles

    return {
      top: (minutes / 60) * HOUR_HEIGHT,
      height: Math.max((duration / 60) * HOUR_HEIGHT, 30), // Minimum 30px height
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav
        title="יומן שבועי"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />

      <View style={styles.content}>
        {/* Week Navigation */}
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={nextWeek} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>היום</Text>
          </TouchableOpacity>

          <Text style={styles.weekTitle}>{getWeekRange()}</Text>

          <TouchableOpacity onPress={previousWeek} style={styles.navButton}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{appointments.length}</Text>
            <Text style={styles.statLabel}>תורים</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
              {appointments.filter(a => a.status === 'confirmed').length}
            </Text>
            <Text style={styles.statLabel}>מאושרים</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>
              {appointments.filter(a => a.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>הושלמו</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ScissorsLoader size={60} color="#007bff" accessibilityLabel="טוען יומן" />
          </View>
        ) : (
          <View style={styles.calendarWrapper}>
            {/* Days Header */}
            <View style={styles.daysHeader}>
              <View style={styles.timeColumnHeader} />
              {weekDays.map((day, index) => (
                <View
                  key={index}
                  style={[
                    styles.dayHeader,
                    isToday(day) && styles.todayHeader
                  ]}
                >
                  <Text style={[
                    styles.dayName,
                    isToday(day) && styles.todayHeaderText
                  ]}>
                    {day.toLocaleDateString('he-IL', { weekday: 'short' })}
                  </Text>
                  <Text style={[
                    styles.dayNumber,
                    isToday(day) && styles.todayHeaderText
                  ]}>
                    {day.getDate()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Timeline Grid */}
            <ScrollView style={styles.scrollContainer}>
              <View style={styles.gridContainer}>
                {/* Hours from 8:00 to 22:00 */}
                {Array.from({ length: 15 }, (_, i) => i + 8).map((hour) => (
                  <View key={hour} style={styles.hourRow}>
                    {/* Time Label */}
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeLabel}>
                        {hour.toString().padStart(2, '0')}:00
                      </Text>
                    </View>

                    {/* Day Columns */}
                    {weekDays.map((day, dayIndex) => {
                      const slotAppointments = getAppointmentsForSlot(day, hour);

                      return (
                        <View
                          key={dayIndex}
                          style={[
                            styles.dayColumn,
                            isToday(day) && styles.todayColumn
                          ]}
                        >
                          {slotAppointments.map((apt, aptIndex) => {
                            const style = getAppointmentStyle(apt);
                            return (
                              <TouchableOpacity
                                key={aptIndex}
                                style={[
                                  styles.appointmentBlock,
                                  {
                                    backgroundColor: getStatusColor(apt.status),
                                    top: style.top,
                                    height: style.height,
                                  }
                                ]}
                                onPress={() => {
                                  setSelectedAppointment(apt);
                                  setModalVisible(true);
                                }}
                              >
                                {style.height >= 30 && (
                                  <Text style={styles.appointmentTime} numberOfLines={1} ellipsizeMode="tail">
                                    {formatTime(apt.date)}
                                  </Text>
                                )}
                                {style.height >= 50 && (
                                  <Text style={styles.appointmentClient} numberOfLines={2} ellipsizeMode="tail">
                                    {getUserName(apt)}
                                  </Text>
                                )}
                                {style.height >= 70 && (
                                  <Text style={styles.appointmentTreatment} numberOfLines={1} ellipsizeMode="tail">
                                    {getTreatmentName(apt.treatmentId)}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Appointment Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>פרטי התור</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>תאריך: </Text>
                    {formatDate(selectedAppointment.date)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>ספר: </Text>
                    {getBarberName(selectedAppointment.barberId)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>טיפול: </Text>
                    {getTreatmentName(selectedAppointment.treatmentId)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>משך: </Text>
                    {selectedAppointment.duration} דקות
                  </Text>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>לקוח: </Text>
                    {getUserName(selectedAppointment)}
                  </Text>
                  {getUserPhone(selectedAppointment) && (
                    <View style={styles.modalPhoneRow}>
                      <Text style={styles.modalLabel}>טלפון: </Text>
                      <View style={styles.modalPhoneContainer}>
                        <Text style={styles.modalPhoneNumber}>
                          {getUserPhone(selectedAppointment)}
                        </Text>
                        <TouchableOpacity
                          style={styles.modalCallButton}
                          onPress={() => handlePhoneCall(getUserPhone(selectedAppointment)!)}
                        >
                          <Ionicons name="call" size={18} color="#fff" />
                          <Text style={styles.modalCallButtonText}>התקשר</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>סטטוס: </Text>
                    {getStatusText(selectedAppointment.status)}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
                  >
                    <Text style={styles.actionButtonText}>אשר</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleStatusChange(selectedAppointment.id, 'completed')}
                  >
                    <Text style={styles.actionButtonText}>השלם</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleStatusChange(selectedAppointment.id, 'cancelled')}
                  >
                    <Text style={styles.actionButtonText}>בטל</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteAppointment(selectedAppointment.id)}
                  >
                    <Text style={styles.actionButtonText}>מחק</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
    paddingTop: 40,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#007bff',
    borderBottomWidth: 0,
  },
  navButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  todayButtonText: {
    color: '#007bff',
    fontWeight: '700',
    fontSize: 13,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#007bff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarWrapper: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  daysHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 2,
    borderBottomColor: '#dee2e6',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  timeColumnHeader: {
    width: 55,
  },
  dayHeader: {
    width: 43,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  todayHeader: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    marginHorizontal: 1,
  },
  dayName: {
    fontSize: 9,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 2,
  },
  todayHeaderText: {
    color: '#fff',
  },
  gridContainer: {
    backgroundColor: '#fff',
    flexDirection: 'column',
  },
  hourRow: {
    flexDirection: 'row',
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeColumn: {
    width: 55,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingTop: 4,
  },
  timeLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  dayColumn: {
    width: 43,
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
    position: 'relative',
  },
  todayColumn: {
    backgroundColor: '#f8fbff',
  },
  appointmentBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 4,
    padding: 4,
    paddingHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  appointmentTime: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  appointmentClient: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  appointmentTreatment: {
    fontSize: 7,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalDetail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  modalLabel: {
    fontWeight: 'bold',
    color: '#666',
  },
  modalPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  modalPhoneNumber: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
  },
  modalCallButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  modalCallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AdminCalendarScreen;
