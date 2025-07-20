import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, getFirestore, query, setDoc, where, deleteDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Barber,
    getBarbers,
    updateBarberProfile
} from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface AdminAvailabilityScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

// Generate next 14 days
const generateNext14Days = () => {
  const days = [];
  const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const dayOfWeek = date.getDay();
    const hebrewDay = hebrewDays[dayOfWeek];
    const dayNum = date.getDate();
    const month = date.getMonth() + 1;
    const isToday = i === 0;
    
    days.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      weekday: hebrewDay,
      displayDate: `${hebrewDay}, ${dayNum}/${month}`,
      fullDate: `${isToday ? 'היום - ' : ''}${hebrewDay} ${dayNum}/${month}`,
      isAvailable: false,
      timeSlots: [] // Available hours for this specific day
    });
  }
  return days;
};

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00'
];

const AdminAvailabilityScreen: React.FC<AdminAvailabilityScreenProps> = ({ onNavigate, onBack }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [availability, setAvailability] = useState(generateNext14Days());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      setLoading(true);
      const barbersData = await getBarbers();
      setBarbers(barbersData);
    } catch (error) {
      console.error('Error loading barbers:', error);
      showToast('שגיאה בטעינת הספרים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBarberAvailability = async (barberId: string) => {
    try {
      const db = getFirestore();
      // Load from the 'availability' collection that booking system uses
      const q = query(collection(db, 'availability'), where('barberId', '==', barberId));
      const snap = await getDocs(q);
      
      const weeklyAvailability: {[key: number]: string[]} = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.isAvailable) {
          // Convert startTime-endTime to hourly slots
          const startHour = parseInt(data.startTime.split(':')[0]);
          const endHour = parseInt(data.endTime.split(':')[0]);
          const slots = [];
          for (let hour = startHour; hour < endHour; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
          }
          weeklyAvailability[data.dayOfWeek] = slots;
        }
      });
      
      // Convert weekly pattern to 14-day format
      const next14Days = generateNext14Days();
      const updatedDays = next14Days.map(day => {
        const date = new Date(day.date);
        const dayOfWeek = date.getDay();
        const hasAvailability = weeklyAvailability[dayOfWeek];
        
        return {
          ...day,
          isAvailable: !!hasAvailability,
          timeSlots: hasAvailability || []
        };
      });
      
      setAvailability(updatedDays);
    } catch (e) {
      console.error('Error loading availability:', e);
      showToast('שגיאה בטעינת זמינות', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const openEditModal = async (barber: Barber) => {
    console.log('Opening modal for barber:', barber.name);
    setSelectedBarber(barber);
    await loadBarberAvailability(barber.id);
    setModalVisible(true);
    console.log('Modal should be visible now');
  };

  const toggleDayAvailability = (date: string) => {
    setAvailability(prev => prev.map(day => 
      day.date === date 
        ? { ...day, isAvailable: !day.isAvailable, timeSlots: day.isAvailable ? [] : ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'] }
        : day
    ));
  };

  const toggleTimeSlot = (date: string, time: string) => {
    setAvailability(prev => prev.map(day => {
      if (day.date === date) {
        const currentSlots = day.timeSlots || [];
        const isSelected = currentSlots.includes(time);
        const newSlots = isSelected 
          ? currentSlots.filter(slot => slot !== time)
          : [...currentSlots, time].sort();
        return { ...day, timeSlots: newSlots };
      }
      return day;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = getFirestore();
      const barberId = selectedBarber?.id || '';
      
      // Delete existing availability records for this barber
      const existingQuery = query(collection(db, 'availability'), where('barberId', '==', barberId));
      const existingDocs = await getDocs(existingQuery);
      await Promise.all(existingDocs.docs.map(doc => deleteDoc(doc.ref)));
      
      // Convert 14-day format to weekly dayOfWeek format
      const weeklyPattern: {[key: number]: string[]} = {};
      
      availability.forEach(day => {
        if (day.isAvailable && day.timeSlots && day.timeSlots.length > 0) {
          const date = new Date(day.date);
          const dayOfWeek = date.getDay();
          
          if (!weeklyPattern[dayOfWeek]) {
            weeklyPattern[dayOfWeek] = day.timeSlots;
          }
        }
      });
      
      // Save new availability records
      const savePromises = Object.entries(weeklyPattern).map(([dayOfWeek, timeSlots]) => {
        if (timeSlots.length > 0) {
          const startTime = timeSlots[0];
          const endTime = timeSlots[timeSlots.length - 1];
          // Convert "HH:mm" to next hour for endTime
          const [endHour, endMin] = endTime.split(':').map(Number);
          const finalEndTime = endMin === 30 ? `${(endHour + 1).toString().padStart(2, '0')}:00` : `${endHour.toString().padStart(2, '0')}:30`;
          
          return setDoc(doc(collection(db, 'availability')), {
            barberId,
            dayOfWeek: parseInt(dayOfWeek),
            startTime,
            endTime: finalEndTime,
            isAvailable: true,
            createdAt: new Date()
          });
        }
      });
      
      await Promise.all(savePromises.filter(Boolean));
      
      // Update barber's available status in barbers collection
      const hasAnyAvailability = Object.keys(weeklyPattern).length > 0;
      if (selectedBarber) {
        await updateBarberProfile(selectedBarber.id, { available: hasAnyAvailability });
        // Update local state
        setBarbers(prev => prev.map(b => 
          b.id === selectedBarber.id ? { ...b, available: hasAnyAvailability } : b
        ));
      }
      
      Alert.alert('הזמינות נשמרה בהצלחה!');
      setModalVisible(false);
      setSelectedBarber(null);
      showToast('זמינות נשמרה בהצלחה!', 'success');
    } catch (e) {
      console.error('Error saving availability:', e);
      Alert.alert('שגיאה בשמירת זמינות');
      showToast('שגיאה בשמירת זמינות', 'error');
    } finally {
      setSaving(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ניהול זמינות"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>טוען ספרים...</Text>
          </View>
        ) : (
          <ScrollView style={styles.barbersList}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>בחר ספר לעריכת זמינות</Text>
              <Text style={styles.headerSubtitle}>
                כאן תוכל לקבוע את שעות העבודה הזמינות לכל ספר
              </Text>
            </View>

            {barbers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>אין ספרים במערכת</Text>
                <TouchableOpacity 
                  style={styles.emptyAddButton} 
                  onPress={() => onNavigate('admin-team')}
                >
                  <Text style={styles.emptyAddButtonText}>הוסף ספר ראשון</Text>
                </TouchableOpacity>
              </View>
            ) : (
              barbers.map((barber) => (
                <TouchableOpacity
                  key={barber.id}
                  style={styles.barberCard}
                  onPress={() => openEditModal(barber)}
                >
                  <View style={styles.barberInfo}>
                    <View style={styles.barberImageContainer}>
                      <View style={styles.barberImage}>
                        <Text style={styles.barberPlaceholder}>✂️</Text>
                      </View>
                    </View>
                    
                    <View style={styles.barberDetails}>
                      <Text style={styles.barberName}>{barber.name}</Text>
                      <Text style={styles.barberExperience}>{barber.experience}</Text>
                      <Text style={styles.editHint}>לחץ לעריכת זמינות</Text>
                    </View>
                  </View>
                  
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Edit Availability Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                עריכת זמינות - {selectedBarber?.name}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.instructionText}>
                בחר ימים וסמן שעות זמינות לספר {selectedBarber?.name}
              </Text>
              
              <Text style={styles.debugText}>
                נמצאו {availability.length} ימים
              </Text>
              
              {availability.map((day) => (
                <View key={day.date} style={styles.dayCard}>
                  <View style={styles.dayTitleContainer}>
                    <Text style={styles.dayTitle}>{day.fullDate}</Text>
                  </View>
                  <View style={styles.dayNameHeader}>
                    <Text style={styles.dayNameText}>יום {day.weekday}</Text>
                    <Text style={styles.dayDateText}>{day.displayDate}</Text>
                  </View>
                  <View style={styles.dayHeader}>
                    <TouchableOpacity 
                      onPress={() => toggleDayAvailability(day.date)} 
                      style={[styles.toggleButton, day.isAvailable ? styles.activeButton : styles.inactiveButton]}
                    >
                      <Text style={styles.toggleText}>
                        {day.isAvailable ? 'פעיל' : 'לא פעיל'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {day.isAvailable && (
                    <View style={styles.timeGrid}>
                      <Text style={styles.timeGridTitle}>בחר שעות זמינות:</Text>
                      <View style={styles.timeSlots}>
                        {timeSlots.map((time) => {
                          const dayTimeSlots: string[] = day.timeSlots || [];
                          const isSelected = dayTimeSlots.includes(time);
                          return (
                            <TouchableOpacity
                              key={`${day.date}-${time}`}
                              style={[styles.timeSlot, isSelected ? styles.selectedTimeSlot : styles.unselectedTimeSlot]}
                              onPress={() => toggleTimeSlot(day.date, time)}
                            >
                              <Text style={[styles.timeSlotText, isSelected && styles.selectedTimeSlotText]}>
                                {time}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={styles.selectedCount}>
                        נבחרו: {day.timeSlots?.length || 0} שעות
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'שומר...' : 'שמור זמינות'}
                </Text>
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
    paddingTop: 100,
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    lineHeight: 20,
  },
  barbersList: {
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
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  barberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  barberImageContainer: {
    position: 'relative',
    marginLeft: 16,
  },
  barberImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barberPlaceholder: {
    fontSize: 24,
    color: '#666',
  },
  availabilityBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  availableBadge: {
    backgroundColor: '#4CAF50',
  },
  unavailableBadge: {
    backgroundColor: '#F44336',
  },
  availabilityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  barberDetails: {
    flex: 1,
  },
  barberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  barberExperience: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
  },
  editHint: {
    fontSize: 12,
    color: '#007bff',
    textAlign: 'right',
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
    padding: 20,
    margin: 20,
    width: '95%',
    maxWidth: 500,
    height: '85%',
    maxHeight: '85%',
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
    color: '#222',
    flex: 1,
    textAlign: 'right',
  },
  modalBody: {
    flex: 1,
    marginBottom: 20,
  },
  dayContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 16,
  },
  dayToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#4CAF50',
  },
  toggleOff: {
    backgroundColor: '#ddd',
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleIndicatorOn: {
    alignSelf: 'flex-end',
  },
  toggleIndicatorOff: {
    alignSelf: 'flex-start',
  },
  timeContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  timeSection: {
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  timeSelector: {
    flexDirection: 'row',
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
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
  saveButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  debugText: {
    fontSize: 14,
    color: '#007bff',
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 4,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayTitleContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  dayDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#28a745',
  },
  inactiveButton: {
    backgroundColor: '#dc3545',
  },
  toggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeInputStyle: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  timeGrid: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeGridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  unselectedTimeSlot: {
    backgroundColor: '#f8f9fa',
    borderColor: '#ddd',
  },
  selectedCount: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  dayNameHeader: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  dayDateText: {
    fontSize: 16,
    color: '#e3f2fd',
    textAlign: 'center',
    marginTop: 4,
  },
  debugDayText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 4,
    borderRadius: 4,
  },
});

export default AdminAvailabilityScreen;