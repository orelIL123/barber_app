import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
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
  BarberAvailability,
  getBarbers, 
  getBarberAvailability,
  updateBarberWeeklyAvailability
} from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface AdminAvailabilityScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminAvailabilityScreen: React.FC<AdminAvailabilityScreenProps> = ({ onNavigate, onBack }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Weekly schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<{
    [dayOfWeek: number]: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
    }
  }>({
    0: { isAvailable: false, startTime: '09:00', endTime: '18:00' }, // Sunday
    1: { isAvailable: true, startTime: '09:00', endTime: '18:00' },  // Monday
    2: { isAvailable: true, startTime: '09:00', endTime: '18:00' },  // Tuesday
    3: { isAvailable: true, startTime: '09:00', endTime: '18:00' },  // Wednesday
    4: { isAvailable: true, startTime: '09:00', endTime: '18:00' },  // Thursday
    5: { isAvailable: false, startTime: '09:00', endTime: '18:00' }, // Friday
    6: { isAvailable: false, startTime: '09:00', endTime: '18:00' }, // Saturday
  });

  const daysOfWeek = [
    'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'
  ];

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

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
      const availabilityData = await getBarberAvailability(barberId);
      
      // Convert availability data to weekly schedule format
      const schedule = { ...weeklySchedule };
      availabilityData.forEach(item => {
        schedule[item.dayOfWeek] = {
          isAvailable: item.isAvailable,
          startTime: item.startTime,
          endTime: item.endTime
        };
      });
      setWeeklySchedule(schedule);
    } catch (error) {
      console.error('Error loading availability:', error);
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
    setSelectedBarber(barber);
    await loadBarberAvailability(barber.id);
    setModalVisible(true);
  };

  const toggleDayAvailability = (dayOfWeek: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        isAvailable: !prev[dayOfWeek].isAvailable
      }
    }));
  };

  const updateDayTime = (dayOfWeek: number, timeType: 'startTime' | 'endTime', time: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [timeType]: time
      }
    }));
  };

  const saveSchedule = async () => {
    if (!selectedBarber) return;

    setSaving(true);
    try {
      // Convert weekly schedule to availability format
      const scheduleData = Object.entries(weeklySchedule).map(([dayOfWeek, schedule]) => ({
        dayOfWeek: parseInt(dayOfWeek),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isAvailable: schedule.isAvailable
      }));

      await updateBarberWeeklyAvailability(selectedBarber.id, scheduleData);
      showToast('זמינות נשמרה בהצלחה');
      setModalVisible(false);
      setSelectedBarber(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
      showToast('שגיאה בשמירת זמינות', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderTimeSelector = (currentTime: string, onTimeChange: (time: string) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSelector}>
      {timeSlots.map((time) => (
        <TouchableOpacity
          key={time}
          style={[
            styles.timeSlot,
            currentTime === time && styles.selectedTimeSlot
          ]}
          onPress={() => onTimeChange(time)}
        >
          <Text style={[
            styles.timeSlotText,
            currentTime === time && styles.selectedTimeSlotText
          ]}>
            {time}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

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
                      <View style={[
                        styles.availabilityBadge,
                        barber.available ? styles.availableBadge : styles.unavailableBadge
                      ]}>
                        <Text style={styles.availabilityText}>
                          {barber.available ? 'זמין' : 'לא זמין'}
                        </Text>
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
              {daysOfWeek.map((dayName, dayOfWeek) => (
                <View key={dayOfWeek} style={styles.dayContainer}>
                  <View style={styles.dayHeader}>
                    <TouchableOpacity
                      style={styles.dayToggle}
                      onPress={() => toggleDayAvailability(dayOfWeek)}
                    >
                      <Text style={styles.dayName}>{dayName}</Text>
                      <View style={[
                        styles.toggleSwitch,
                        weeklySchedule[dayOfWeek].isAvailable ? styles.toggleOn : styles.toggleOff
                      ]}>
                        <View style={[
                          styles.toggleIndicator,
                          weeklySchedule[dayOfWeek].isAvailable ? styles.toggleIndicatorOn : styles.toggleIndicatorOff
                        ]} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {weeklySchedule[dayOfWeek].isAvailable && (
                    <View style={styles.timeContainer}>
                      <View style={styles.timeSection}>
                        <Text style={styles.timeLabel}>שעת התחלה</Text>
                        {renderTimeSelector(
                          weeklySchedule[dayOfWeek].startTime,
                          (time) => updateDayTime(dayOfWeek, 'startTime', time)
                        )}
                      </View>
                      
                      <View style={styles.timeSection}>
                        <Text style={styles.timeLabel}>שעת סיום</Text>
                        {renderTimeSelector(
                          weeklySchedule[dayOfWeek].endTime,
                          (time) => updateDayTime(dayOfWeek, 'endTime', time)
                        )}
                      </View>
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
                onPress={saveSchedule}
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
    padding: 24,
    margin: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
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
  dayHeader: {
    marginBottom: 12,
  },
  dayToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
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
});

export default AdminAvailabilityScreen;