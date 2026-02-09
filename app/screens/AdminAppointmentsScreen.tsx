import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Modal,
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
    Barber,
    batchUpdateAppointmentsStatus,
    createAppointment,
    deleteAppointment,
    getAllUsers,
    getBarberAppointmentsForDay,
    getBarberAvailableSlots,
    getBarbers,
    getRecentAppointments,
    getTreatments,
    Treatment,
    updateAppointment,
    UserProfile
} from '../../services/firebase';
import { ScissorsLoader } from '../components/ScissorsLoader';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';
import { isOnGrid, isValidDuration, SLOT_SIZE_MINUTES, slotFitsInDay, toYMD } from '../constants/scheduling';

interface AdminAppointmentsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminAppointmentsScreen: React.FC<AdminAppointmentsScreenProps> = ({ onNavigate, onBack }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed'>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null); // null = all days, date string = specific date
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Add appointment form state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [appointmentNotes, setAppointmentNotes] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'existing' | 'manual'>('manual');
  const [manualClientName, setManualClientName] = useState<string>('');
  const [manualClientPhone, setManualClientPhone] = useState<string>('');
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Load appointments for selected date and barber
  useEffect(() => {
    if (selectedBarber && selectedDate) {
      loadDayAppointments();
    }
  }, [selectedBarber, selectedDate]);

  const loadDayAppointments = async () => {
    if (!selectedBarber || !selectedDate) {
      setDayAppointments([]);
      setAvailableSlots([]);
      return;
    }
    
    try {
      // Load appointments for the day
      const appointments = await getBarberAppointmentsForDay(selectedBarber, selectedDate);
      setDayAppointments(appointments);
      console.log(`📅 Loaded ${appointments.length} appointments for ${selectedDate.toDateString()}`);

      // Load available slots for the barber on this date
      const dateStr = toYMD(selectedDate);
      const slots = await getBarberAvailableSlots(selectedBarber, dateStr);
      setAvailableSlots(slots);
      console.log(`🕐 Loaded ${slots.length} available slots for ${dateStr}:`, slots);
    } catch (error) {
      console.error('Error loading day appointments:', error);
      setDayAppointments([]);
      setAvailableSlots([]);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, barbersData, usersData, treatmentsData] = await Promise.all([
        getRecentAppointments(), // Optimized: loads only last 14 days + future
        getBarbers(),
        getAllUsers(),
        getTreatments()
      ]);
      
      // Auto-complete past appointments using batch update (much faster!)
      const now = new Date();
      const pastAppointmentIds = appointmentsData
        .filter(apt => {
          const aptTime = apt.date.toMillis ? apt.date.toMillis() : apt.date.toDate().getTime();
          return aptTime < now.getTime() && apt.status === 'confirmed';
        })
        .map(apt => apt.id);
      
      // Batch update + local state update (no reload needed!)
      if (pastAppointmentIds.length > 0) {
        console.log(`🔄 Auto-completing ${pastAppointmentIds.length} past appointments (batch)`);
        await batchUpdateAppointmentsStatus(pastAppointmentIds, 'completed');
        
        // Update state locally instead of reloading from server
        const updatedAppointments = appointmentsData.map(apt => 
          pastAppointmentIds.includes(apt.id) 
            ? { ...apt, status: 'completed' as const }
            : apt
        );
        setAppointments(updatedAppointments);
      } else {
        setAppointments(appointmentsData);
      }
      
      setBarbers(barbersData);
      setUsers(usersData);
      setTreatments(treatmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
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
    // Handle both Timestamp objects and regular Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
    // Check if this is a manual client
    if (appointment.isManualClient && appointment.clientName) {
      return appointment.clientName;
    }
    const user = users.find(u => u.uid === appointment.userId);
    return user ? user.displayName : 'לא נמצא';
  };

  const getUserPhone = (appointment: any) => {
    // Check if this is a manual client
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
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    Linking.openURL(`tel:${cleanedNumber}`).catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את אפליקציית הטלפון');
    });
  };

  const getTreatmentName = (treatmentId: string) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    return treatment ? treatment.name : 'לא נמצא';
  };

  // Generate available dates (14 days from today)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Return available slots for the barber on selected date
  const generateTimeSlotsForAdmin = () => {
    // If no barber or date selected, return empty
    if (!selectedBarber || !selectedDate) {
      return [];
    }
    
    // Return the actual available slots from the barber's availability
    return availableSlots;
  };

  // Check if a slot is occupied
  const isSlotOccupied = (slotTime: string): boolean => {
    if (!dayAppointments || dayAppointments.length === 0) return false;
    if (!selectedTreatment) return false;

    const selectedTreatmentObj = treatments.find(t => t.id === selectedTreatment);
    if (!selectedTreatmentObj) return false;

    const [hour, minute] = slotTime.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + selectedTreatmentObj.duration * 60000);

    for (const appt of dayAppointments) {
      try {
        let apptStart: Date;
        if (appt.date && typeof appt.date.toDate === 'function') {
          apptStart = appt.date.toDate();
        } else if (appt.date) {
          apptStart = new Date(appt.date);
        } else {
          continue;
        }

        const apptDuration = appt.duration || 25;
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);

        // Check for overlap
        const hasOverlap = slotStart < apptEnd && slotEnd > apptStart;
        if (hasOverlap) {
          return true;
        }
      } catch (error) {
        console.error('Error checking slot:', error);
        continue;
      }
    }

    return false;
  };

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime('');
    setSelectedUser('');
    setSelectedBarber('');
    setSelectedTreatment('');
    setAppointmentNotes('');
    setInputMethod('manual');
    setManualClientName('');
    setManualClientPhone('');
  };

  const handleCreateAppointment = async () => {
    // Validate required fields based on input method
    if (!selectedDate || !selectedTime || !selectedBarber || !selectedTreatment) {
      showToast('אנא מלא את כל השדות החובה', 'error');
      return;
    }

    // Double-check if slot is occupied
    if (isSlotOccupied(selectedTime)) {
      showToast('⚠️ Slot זה כבר תפוס - אנא בחר שעה אחרת', 'error');
      return;
    }

    if (inputMethod === 'manual') {
      if (!manualClientName.trim() || !manualClientPhone.trim()) {
        showToast('אנא מלא שם ומספר טלפון של הלקוח', 'error');
        return;
      }
    } else {
      if (!selectedUser) {
        showToast('אנא בחר לקוח מהרשימה', 'error');
        return;
      }
    }

    try {
      // Validate that the selected time is on the 25-minute grid
      if (!isOnGrid(selectedTime)) {
        showToast(`זמן חייב להיות על גריד של ${SLOT_SIZE_MINUTES} דקות (HH:00, HH:25, HH:50, HH+1:15)`, 'error');
        return;
      }

      // Create appointment date with selected date and time
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const selectedTreatmentObj = treatments.find(t => t.id === selectedTreatment);
      
      // Validate treatment duration is a multiple of 25 minutes
      if (selectedTreatmentObj && !isValidDuration(selectedTreatmentObj.duration)) {
        showToast(`משך הטיפול חייב להיות כפולה של ${SLOT_SIZE_MINUTES} דקות`, 'error');
        return;
      }

      // Validate that the appointment doesn't overflow past day end
      const dayEndHour = 24; // Midnight - matches admin settings
      if (selectedTreatmentObj && !slotFitsInDay(selectedTime, selectedTreatmentObj.duration, dayEndHour)) {
        showToast(`התור גולש מעבר לסוף המשמרת (${dayEndHour}:00). בחר שעה מוקדמת יותר או טיפול קצר יותר.`, 'error');
        return;
      }
      const appointmentData = {
        userId: inputMethod === 'manual' ? 'manual-client' : selectedUser,
        barberId: selectedBarber,
        treatmentId: selectedTreatment,
        date: Timestamp.fromDate(appointmentDateTime),
        status: 'confirmed' as const, // Changed from 'pending' to 'confirmed'
        notes: appointmentNotes,
        duration: selectedTreatmentObj?.duration || 60, // Default to 60 minutes if not found
        // Add manual client info if using manual input
        ...(inputMethod === 'manual' && {
          clientName: manualClientName.trim(),
          clientPhone: manualClientPhone.trim(),
          isManualClient: true
        })
      };

      await createAppointment(appointmentData);
      
      // Reload appointments
      await loadData();
      await loadDayAppointments(); // Refresh day appointments to update slots
      
      showToast('התור נוסף בהצלחה');
      setAddModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      showToast('שגיאה ביצירת התור', 'error');
    }
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
              await loadDayAppointments(); // Refresh day appointments to update slots
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

  const filteredAppointments = appointments
    .filter(apt => {
      if (filter === 'all') return true;
      return apt.status === filter;
    })
    .filter(apt => {
      // Filter by selected specific date if any
      if (selectedDayFilter === null) return true;
      const aptDate = apt.date.toMillis ? new Date(apt.date.toMillis()) : apt.date.toDate();
      return aptDate.toDateString() === selectedDayFilter;
    })
    .sort((a, b) => {
      // Sort by date - nearest first
      const aTime = a.date.toMillis ? a.date.toMillis() : a.date.toDate().getTime();
      const bTime = b.date.toMillis ? b.date.toMillis() : b.date.toDate().getTime();
      return aTime - bTime;
    });

  // Get the actual next appointment (not just first in list)
  const getActualNextAppointment = () => {
    const now = new Date();
    const upcomingAppointments = filteredAppointments
      .filter(apt => apt.status === 'confirmed')
      .filter(apt => {
        const aptTime = apt.date.toMillis ? apt.date.toMillis() : apt.date.toDate().getTime();
        return aptTime > now.getTime();
      })
      .sort((a, b) => {
        const aTime = a.date.toMillis ? a.date.toMillis() : a.date.toDate().getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : b.date.toDate().getTime();
        return aTime - bTime;
      });
    
    return upcomingAppointments[0] || null;
  };

  const actualNextAppointment = getActualNextAppointment();

  const getNextClient = () => {
    const now = new Date();
    const upcomingAppointments = appointments
      .filter(apt => apt.status === 'confirmed')
      .filter(apt => {
        const aptTime = apt.date.toMillis ? apt.date.toMillis() : apt.date.toDate().getTime();
        return aptTime > now.getTime();
      })
      .sort((a, b) => {
        const aTime = a.date.toMillis ? a.date.toMillis() : a.date.toDate().getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : b.date.toDate().getTime();
        return aTime - bTime;
      });
    
    return upcomingAppointments[0] || null;
  };

  const nextClient = getNextClient();

  const filterButtons = [
    { key: 'all', label: 'הכל', count: appointments.length },
    { key: 'confirmed', label: 'מאושר', count: appointments.filter(a => a.status === 'confirmed').length },
    { key: 'completed', label: 'הושלם', count: appointments.filter(a => a.status === 'completed').length },
  ];

  // Generate week days starting from today
  const getWeekDays = () => {
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date,
        dateString: date.toDateString(),
        isToday: i === 0,
        label: date.toLocaleDateString('he-IL', { 
          weekday: 'short',
          day: 'numeric'
        }) + (i === 0 ? ' (היום)' : ''),
        count: appointments.filter(apt => {
          const aptDate = apt.date.toMillis ? new Date(apt.date.toMillis()) : apt.date.toDate();
          return aptDate.toDateString() === date.toDateString();
        }).length
      });
    }
    
    return days;
  };

  const weekDays = getWeekDays();

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ניהול תורים"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />
      
      <View style={styles.content}>
        {/* Week Days View */}
        <View style={styles.weekContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.weekDayButton,
                selectedDayFilter === null && styles.activeWeekDayButton
              ]}
              onPress={() => setSelectedDayFilter(null)}
            >
              <Text style={[
                styles.weekDayText,
                selectedDayFilter === null && styles.activeWeekDayText
              ]}>
                כל השבוע
              </Text>
              <Text style={[
                styles.weekDayCount,
                selectedDayFilter === null && styles.activeWeekDayCount
              ]}>
                {appointments.length}
              </Text>
            </TouchableOpacity>
            
            {weekDays.map((day) => (
              <TouchableOpacity
                key={day.dateString}
                style={[
                  styles.weekDayButton,
                  selectedDayFilter === day.dateString && styles.activeWeekDayButton,
                  // Only show today styling when that specific day is selected
                  day.isToday && selectedDayFilter === day.dateString && styles.todayButton
                ]}
                onPress={() => setSelectedDayFilter(day.dateString)}
              >
                <Text style={[
                  styles.weekDayText,
                  selectedDayFilter === day.dateString && styles.activeWeekDayText,
                  // Only show today text styling when that specific day is selected
                  day.isToday && selectedDayFilter === day.dateString && styles.todayText
                ]}>
                  {day.label}
                </Text>
                <Text style={[
                  styles.weekDayCount,
                  selectedDayFilter === day.dateString && styles.activeWeekDayCount,
                  // Only show today count styling when that specific day is selected
                  day.isToday && selectedDayFilter === day.dateString && styles.todayCount
                ]}>
                  {day.count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterButtons.map((button) => (
              <TouchableOpacity
                key={button.key}
                style={[
                  styles.filterButton,
                  filter === button.key && styles.activeFilterButton
                ]}
                onPress={() => setFilter(button.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filter === button.key && styles.activeFilterButtonText
                ]}>
                  {button.label} ({button.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Next Client Button */}
        {actualNextAppointment && (
          <View style={styles.nextClientContainer}>
            <TouchableOpacity 
              style={styles.nextClientButton}
              onPress={() => {
                setSelectedAppointment(actualNextAppointment);
                setModalVisible(true);
              }}
            >
              <Ionicons name="person" size={16} color="#fff" />
              <Text style={styles.nextClientText}>
                הלקוח הבא: {getUserName(actualNextAppointment)} ב-{formatDate(actualNextAppointment.date)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Appointments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ScissorsLoader size={60} color="#007bff" accessibilityLabel="טוען תורים" />
          </View>
        ) : (
          <ScrollView style={styles.appointmentsList}>
            {filteredAppointments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>אין תורים למצב זה</Text>
              </View>
            ) : (
              filteredAppointments.map((appointment, index) => {
                const isNextAppointment = actualNextAppointment && appointment.id === actualNextAppointment.id;
                return (
                  <TouchableOpacity
                    key={appointment.id}
                    style={[
                      styles.appointmentCard,
                      isNextAppointment && styles.nextAppointmentCard
                    ]}
                    onPress={() => {
                      setSelectedAppointment(appointment);
                      setModalVisible(true);
                    }}
                  >
                    <View style={styles.appointmentHeader}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(appointment.status) }
                      ]}>
                        <Text style={styles.statusText}>
                          {isNextAppointment ? 'התור הבא' : getStatusText(appointment.status)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.appointmentDate,
                        isNextAppointment && styles.nextAppointmentDate
                      ]}>
                        {formatDate(appointment.date)}
                      </Text>
                    </View>
                  
                  <View style={styles.appointmentDetails}>
                    <View style={styles.appointmentRow}>
                      <Text style={styles.appointmentLabel}>ספר:</Text>
                      <Text style={styles.appointmentValue}>
                        {getBarberName(appointment.barberId)}
                      </Text>
                    </View>
                    
                    <View style={styles.appointmentRow}>
                      <Text style={styles.appointmentLabel}>טיפול:</Text>
                      <Text style={styles.appointmentValue}>
                        {getTreatmentName(appointment.treatmentId)}
                      </Text>
                    </View>
                    
                    <View style={styles.appointmentRow}>
                      <Text style={styles.appointmentLabel}>לקוח:</Text>
                      <View style={styles.clientInfoContainer}>
                        <Text style={styles.appointmentValue}>
                          {getUserName(appointment)}
                        </Text>
                        {getUserPhone(appointment) && (
                          <View style={styles.phoneContainer}>
                            <Text style={styles.phoneNumber}>
                              {getUserPhone(appointment)}
                            </Text>
                            <TouchableOpacity
                              style={styles.callButton}
                              onPress={() => handlePhoneCall(getUserPhone(appointment)!)}
                            >
                              <Ionicons name="call" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setAddModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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

      {/* Add Appointment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>הוספת תור חדש</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Date Selection */}
              <Text style={styles.formLabel}>בחר תאריך *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateContainer}>
                {generateAvailableDates().map((date, index) => (
                  <TouchableOpacity
                    key={`date-${date.getTime()}`}
                    style={[
                      styles.dateButton,
                      selectedDate.toDateString() === date.toDateString() && styles.selectedDateButton
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.dateButtonText,
                      selectedDate.toDateString() === date.toDateString() && styles.selectedDateButtonText
                    ]}>
                      {date.toLocaleDateString('he-IL', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Time Selection */}
              <Text style={styles.formLabel}>
                בחר שעה * 
                {selectedTreatment && selectedBarber && availableSlots.length > 0 && (
                  <Text style={styles.formHint}> (אדום = תפוס, לבן = פנוי)</Text>
                )}
              </Text>
              {!selectedBarber || !selectedDate ? (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>
                    🔹 בחר תאריך וספר קודם כדי לראות שעות זמינות
                  </Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>
                    ⚠️ אין זמינות מוגדרת ליום זה
                  </Text>
                  <Text style={styles.placeholderSubtext}>
                    יש להגדיר זמינות במסך "ניהול זמינות"
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeContainer}>
                  {generateTimeSlotsForAdmin().map((time, index) => {
                    const occupied = isSlotOccupied(time);
                    return (
                      <TouchableOpacity
                        key={`time-${time}`}
                        style={[
                          styles.timeButton,
                          selectedTime === time && styles.selectedTimeButton,
                          occupied && styles.occupiedTimeButton
                        ]}
                        onPress={() => {
                          if (occupied) {
                            showToast('⚠️ Slot זה תפוס - בחר שעה אחרת', 'error');
                          } else {
                            setSelectedTime(time);
                          }
                        }}
                        disabled={occupied}
                      >
                        <Text style={[
                          styles.timeButtonText,
                          selectedTime === time && styles.selectedTimeButtonText,
                          occupied && styles.occupiedTimeButtonText
                        ]}>
                          {time}
                        </Text>
                        {occupied && (
                          <Text style={styles.occupiedBadge}>✕</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Client Input Method Toggle */}
              <Text style={styles.formLabel}>פרטי לקוח *</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    inputMethod === 'manual' && styles.activeToggleButton
                  ]}
                  onPress={() => setInputMethod('manual')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    inputMethod === 'manual' && styles.activeToggleButtonText
                  ]}>
                    הזנה ידנית
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    inputMethod === 'existing' && styles.activeToggleButton
                  ]}
                  onPress={() => setInputMethod('existing')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    inputMethod === 'existing' && styles.activeToggleButtonText
                  ]}>
                    בחירה מרשימה
                  </Text>
                </TouchableOpacity>
              </View>

              {inputMethod === 'manual' ? (
                <View>
                  <Text style={styles.subFormLabel}>שם הלקוח *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="הזן שם מלא"
                    value={manualClientName}
                    onChangeText={setManualClientName}
                    textAlign="right"
                  />
                  
                  <Text style={styles.subFormLabel}>מספר טלפון *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="050-123-4567"
                    value={manualClientPhone}
                    onChangeText={setManualClientPhone}
                    keyboardType="phone-pad"
                    textAlign="right"
                  />
                </View>
              ) : (
                <ScrollView style={styles.selectionContainer}>
                  {users.map((user) => (
                    <TouchableOpacity
                      key={user.uid}
                      style={[
                        styles.selectionButton,
                        selectedUser === user.uid && styles.selectedSelectionButton
                      ]}
                      onPress={() => setSelectedUser(user.uid)}
                    >
                      <Text style={[
                        styles.selectionButtonText,
                        selectedUser === user.uid && styles.selectedSelectionButtonText
                      ]}>
                        {user.displayName}
                      </Text>
                      <Text style={styles.selectionButtonSubtext}>
                        {user.email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Barber Selection */}
              <Text style={styles.formLabel}>בחר ספר *</Text>
              <ScrollView style={styles.selectionContainer}>
                {barbers.map((barber) => (
                  <TouchableOpacity
                    key={barber.id}
                    style={[
                      styles.selectionButton,
                      selectedBarber === barber.id && styles.selectedSelectionButton
                    ]}
                    onPress={() => setSelectedBarber(barber.id)}
                  >
                    <Text style={[
                      styles.selectionButtonText,
                      selectedBarber === barber.id && styles.selectedSelectionButtonText
                    ]}>
                      {barber.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Treatment Selection */}
              <Text style={styles.formLabel}>בחר טיפול *</Text>
              <ScrollView style={styles.selectionContainer}>
                {treatments.map((treatment) => (
                  <TouchableOpacity
                    key={treatment.id}
                    style={[
                      styles.selectionButton,
                      selectedTreatment === treatment.id && styles.selectedSelectionButton
                    ]}
                    onPress={() => setSelectedTreatment(treatment.id)}
                  >
                    <Text style={[
                      styles.selectionButtonText,
                      selectedTreatment === treatment.id && styles.selectedSelectionButtonText
                    ]}>
                      {treatment.name}
                    </Text>
                    <Text style={styles.selectionButtonSubtext}>
                      ₪{treatment.price} • {treatment.duration} דקות
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Notes */}
              <Text style={styles.formLabel}>הערות</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="הערות לתור..."
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
                textAlign="right"
              />
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelFormButton}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelFormButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveFormButton}
                onPress={handleCreateAppointment}
              >
                <Text style={styles.saveFormButtonText}>שמור תור</Text>
              </TouchableOpacity>
            </View>
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
  weekContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekDayButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 70,
  },
  activeWeekDayButton: {
    backgroundColor: '#007bff',
  },
  todayButton: {
    backgroundColor: '#28a745',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  activeWeekDayText: {
    color: '#fff',
  },
  todayText: {
    color: '#fff',
  },
  weekDayCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  activeWeekDayCount: {
    color: '#fff',
  },
  todayCount: {
    color: '#fff',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  appointmentsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  nextAppointmentCard: {
    borderWidth: 3,
    borderColor: '#28a745',
    backgroundColor: '#f8fff8',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextAppointmentDate: {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentDetails: {
    gap: 8,
  },
  appointmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appointmentLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
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
  // New styles for Add Appointment functionality
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  formContainer: {
    maxHeight: 400,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'right',
  },
  dateContainer: {
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 80,
  },
  selectedDateButton: {
    backgroundColor: '#007bff',
  },
  dateButtonText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedDateButtonText: {
    color: '#fff',
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 60,
  },
  selectedTimeButton: {
    backgroundColor: '#007bff',
  },
  occupiedTimeButton: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    opacity: 0.6,
  },
  timeButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedTimeButtonText: {
    color: '#fff',
  },
  occupiedTimeButtonText: {
    color: '#f44336',
    textDecorationLine: 'line-through',
  },
  occupiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f44336',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    borderRadius: 8,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  formHint: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'normal',
  },
  placeholderContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginBottom: 16,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  selectionContainer: {
    maxHeight: 150,
    marginBottom: 8,
  },
  selectionButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedSelectionButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
  },
  selectedSelectionButtonText: {
    color: '#007bff',
  },
  selectionButtonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  cancelFormButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelFormButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveFormButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveFormButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // New styles for client input method
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#007bff',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeToggleButtonText: {
    color: '#fff',
  },
  subFormLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontSize: 16,
    marginBottom: 8,
  },
  // Next client button styles
  nextClientContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextClientButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextClientText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    textAlign: 'center',
  },
  // Phone call styles
  clientInfoContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  phoneNumber: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '500',
  },
  callButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
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
});

export default AdminAppointmentsScreen;