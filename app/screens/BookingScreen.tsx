import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal
} from 'react-native';
import { 
  getBarbers, 
  getTreatments, 
  createAppointment,
  getCurrentUser,
  Barber,
  Treatment
} from '../../services/firebase';
import { Timestamp } from 'firebase/firestore';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface BookingScreenProps {
  onNavigate: (screen: string) => void;
  route?: {
    params?: {
      barberId?: string;
    };
  };
}

const BookingScreen: React.FC<BookingScreenProps> = ({ onNavigate, route }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const preSelectedBarberId = route?.params?.barberId;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [barbersData, treatmentsData] = await Promise.all([
        getBarbers(),
        getTreatments()
      ]);
      
      setBarbers(barbersData);
      setTreatments(treatmentsData);
      
      // If barber is pre-selected, set it and skip to next step
      if (preSelectedBarberId) {
        const preSelectedBarber = barbersData.find(b => b.id === preSelectedBarberId);
        if (preSelectedBarber) {
          setSelectedBarber(preSelectedBarber);
          setCurrentStep(2);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableTimes = () => {
    const times = [];
    for (let hour = 9; hour <= 20; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 20) {
        times.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    setAvailableTimes(times);
  };

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Fridays (5) and Saturdays (6)
      if (date.getDay() !== 5 && date.getDay() !== 6) {
        dates.push(date);
      }
    }
    
    return dates;
  };

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    setCurrentStep(2);
  };

  const handleTreatmentSelect = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setCurrentStep(3);
    generateAvailableTimes();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentStep(4);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('שגיאה', 'יש להתחבר כדי לקבוע תור');
      onNavigate('profile');
      return;
    }

    if (!selectedBarber || !selectedTreatment || !selectedDate || !selectedTime) {
      Alert.alert('שגיאה', 'יש לבחור את כל הפרטים');
      return;
    }

    setBooking(true);
    try {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      await createAppointment({
        userId: user.uid,
        barberId: selectedBarber.id,
        treatmentId: selectedTreatment.id,
        date: Timestamp.fromDate(appointmentDateTime),
        status: 'pending'
      });

      setShowConfirmModal(false);
      Alert.alert(
        'התור נקבע בהצלחה!',
        `התור שלך נקבע ל-${selectedDate.toLocaleDateString('he-IL')} בשעה ${selectedTime}`,
        [
          {
            text: 'אישור',
            onPress: () => {
              resetBooking();
              onNavigate('profile');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('שגיאה', 'לא ניתן לקבוע את התור');
    } finally {
      setBooking(false);
    }
  };

  const resetBooking = () => {
    setCurrentStep(preSelectedBarberId ? 2 : 1);
    if (!preSelectedBarberId) {
      setSelectedBarber(null);
    }
    setSelectedTreatment(null);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      
      switch (currentStep) {
        case 2:
          if (!preSelectedBarberId) {
            setSelectedBarber(null);
          }
          break;
        case 3:
          setSelectedTreatment(null);
          break;
        case 4:
          setSelectedDate(null);
          break;
      }
    }
  };

  const formatDate = (date: Date) => {
    const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    return `יום ${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'בחר ספר';
      case 2: return 'בחר טיפול';
      case 3: return 'בחר תאריך';
      case 4: return 'בחר שעה';
      default: return 'הזמנת תור';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav title="הזמנת תור" onBellPress={() => {}} onMenuPress={() => {}} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title="הזמנת תור" onBellPress={() => {}} onMenuPress={() => {}} />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / 4) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>שלב {currentStep} מתוך 4</Text>
      </View>

      {/* Step Header */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>חזור</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Barber */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.barbersGrid}>
              {barbers.map((barber) => (
                <TouchableOpacity
                  key={barber.id}
                  style={[
                    styles.barberCard,
                    selectedBarber?.id === barber.id && styles.selectedCard
                  ]}
                  onPress={() => handleBarberSelect(barber)}
                  disabled={!barber.available}
                >
                  <View style={styles.barberImage}>
                    <Text style={styles.barberPlaceholder}>✂️</Text>
                  </View>
                  <Text style={styles.barberName}>{barber.name}</Text>
                  <Text style={styles.barberExperience}>{barber.experience}</Text>
                  {!barber.available && (
                    <View style={styles.unavailableBadge}>
                      <Text style={styles.unavailableText}>לא זמין</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Select Treatment */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.treatmentsContainer}>
              {treatments.map((treatment) => (
                <TouchableOpacity
                  key={treatment.id}
                  style={[
                    styles.treatmentCard,
                    selectedTreatment?.id === treatment.id && styles.selectedCard
                  ]}
                  onPress={() => handleTreatmentSelect(treatment)}
                >
                  <View style={styles.treatmentImage}>
                    <Text style={styles.treatmentPlaceholder}>💇</Text>
                  </View>
                  <View style={styles.treatmentInfo}>
                    <Text style={styles.treatmentName}>{treatment.name}</Text>
                    <Text style={styles.treatmentDescription}>{treatment.description}</Text>
                    <View style={styles.treatmentDetails}>
                      <Text style={styles.treatmentPrice}>₪{treatment.price}</Text>
                      <Text style={styles.treatmentDuration}>{treatment.duration} דקות</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Select Date */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <View style={styles.datesContainer}>
              {generateAvailableDates().map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateCard,
                    selectedDate?.getTime() === date.getTime() && styles.selectedCard
                  ]}
                  onPress={() => handleDateSelect(date)}
                >
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                  <Text style={styles.dateNumber}>{date.getDate()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Select Time */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <View style={styles.timesContainer}>
              {availableTimes.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeCard,
                    selectedTime === time && styles.selectedCard
                  ]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <Text style={styles.timeText}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Selected Summary */}
        {currentStep > 1 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>סיכום הזמנה</Text>
            
            {selectedBarber && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>ספר:</Text>
                <Text style={styles.summaryValue}>{selectedBarber.name}</Text>
              </View>
            )}
            
            {selectedTreatment && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>טיפול:</Text>
                <Text style={styles.summaryValue}>{selectedTreatment.name}</Text>
              </View>
            )}
            
            {selectedDate && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>תאריך:</Text>
                <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
              </View>
            )}
            
            {selectedTime && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>שעה:</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>אישור הזמנה</Text>
            
            <View style={styles.confirmationDetails}>
              <Text style={styles.confirmationText}>
                ספר: {selectedBarber?.name}
              </Text>
              <Text style={styles.confirmationText}>
                טיפול: {selectedTreatment?.name}
              </Text>
              <Text style={styles.confirmationText}>
                תאריך: {selectedDate && formatDate(selectedDate)}
              </Text>
              <Text style={styles.confirmationText}>
                שעה: {selectedTime}
              </Text>
              <Text style={styles.confirmationPrice}>
                מחיר: ₪{selectedTreatment?.price}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmBooking}
                disabled={booking}
              >
                <Text style={styles.confirmButtonText}>
                  {booking ? 'מבצע הזמנה...' : 'אישור הזמנה'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
                disabled={booking}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontWeight: '500',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  barbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  barberCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#007bff',
  },
  barberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  barberPlaceholder: {
    fontSize: 30,
    color: '#666',
  },
  barberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'center',
  },
  barberExperience: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  unavailableBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  treatmentsContainer: {
    marginBottom: 16,
  },
  treatmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  treatmentImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  treatmentPlaceholder: {
    fontSize: 30,
    color: '#666',
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  treatmentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right',
  },
  treatmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  treatmentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  treatmentDuration: {
    fontSize: 14,
    color: '#666',
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dateCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeCard: {
    width: (width - 60) / 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.9,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationDetails: {
    marginBottom: 24,
  },
  confirmationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  confirmationPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginTop: 8,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingScreen; 