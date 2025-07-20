import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Barber,
    createAppointment,
    getBarberAppointmentsForDay,
    getBarberAvailability,
    getBarbers,
    getCurrentUser,
    getTreatments,
    initializeBarberAvailability,
    Treatment
} from '../../services/firebase';
import ConfirmationModal from '../components/ConfirmationModal';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface BookingScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  route?: {
    params?: {
      barberId?: string;
    };
  };
}

const BookingScreen: React.FC<BookingScreenProps> = ({ onNavigate, onBack, onClose, route }) => {
  const { t } = useTranslation();
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
  const [detailsBarber, setDetailsBarber] = useState<Barber | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      Alert.alert(t('common.error'), t('errors.load_data_error'));
    } finally {
      setLoading(false);
    }
  };

  // Check if a slot is available (no overlap with existing appointments)
  function isSlotAvailable(slotStart: Date, slotDuration: number, appointments: any[]) {
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
    
    console.log('Checking slot availability:', {
      slotStart: `${slotStart.getHours()}:${slotStart.getMinutes().toString().padStart(2, '0')}`,
      slotDuration,
      totalAppointments: appointments.length
    });
    
    for (const appt of appointments) {
      try {
        // Handle Firestore Timestamp objects
        let apptStart: Date;
        if (appt.date && typeof appt.date.toDate === 'function') {
          // Firestore Timestamp
          apptStart = appt.date.toDate();
        } else if (appt.date) {
          // Regular date string or number
          apptStart = new Date(appt.date);
        } else if (appt.time) {
          // Fallback to time field
          apptStart = new Date(appt.time);
        } else {
          console.warn('Appointment missing date/time:', appt);
          continue;
        }
        
        const apptDuration = appt.duration || 30; // Default 30min
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);
        
        // Check for overlap - if any part of the slot overlaps with appointment
        const hasOverlap = slotStart < apptEnd && slotEnd > apptStart;
        
        if (hasOverlap) {
          console.log('❌ Slot blocked by appointment:', {
            slotTime: `${slotStart.getHours()}:${slotStart.getMinutes().toString().padStart(2, '0')}`,
            apptTime: `${apptStart.getHours()}:${apptStart.getMinutes().toString().padStart(2, '0')}`,
            apptDuration,
            apptStatus: appt.status,
            apptId: appt.id
          });
          return false;
        }
      } catch (error) {
        console.error('Error processing appointment:', appt, error);
        continue;
      }
    }
    
    console.log('✅ Slot is available');
    return true;
  }

  // Generate available slots for the selected barber, date, and treatment duration
  async function generateAvailableSlots(barberId: string, date: Date, treatmentDuration: number) {
    try {
      console.log('=== GENERATING TIME SLOTS ===');
      console.log('Barber ID:', barberId);
      console.log('Date:', date.toDateString());
      console.log('Treatment Duration:', treatmentDuration, 'minutes');
      
      // Get barber's availability for the selected day
      const dayOfWeek = date.getDay();
      
      // Initialize availability if it doesn't exist
      await initializeBarberAvailability(barberId);
      
      const barberAvailability = await getBarberAvailability(barberId);
      const dayAvailability = barberAvailability.find(a => a.dayOfWeek === dayOfWeek);
      
      if (!dayAvailability || !dayAvailability.isAvailable) {
        console.log('❌ Barber not available on this day, using default hours');
        // Use default working hours if no availability is set
        const defaultStartHour = 9;
        const defaultEndHour = 18;
        
        // Skip if it's Friday (5) or Saturday (6)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          console.log('❌ Weekend day, no default hours');
          return [];
        }
        
        // Use default hours for weekdays
        const appointments = await getBarberAppointmentsForDay(barberId, date);
        console.log('Found', appointments.length, 'appointments for this day');
        
        const slots = [];
        
        // Generate time slots with default hours
        const startTime = new Date(date);
        startTime.setHours(defaultStartHour, 0, 0, 0);
        
        const endTime = new Date(date);
        endTime.setHours(defaultEndHour, 0, 0, 0);
        
        const currentSlot = new Date(startTime);
        
        while (currentSlot < endTime) {
          const slotEnd = new Date(currentSlot.getTime() + treatmentDuration * 60000);
          if (slotEnd > endTime) {
            break;
          }
          
          // Skip past times if it's today
          const now = new Date();
          if (date.toDateString() === now.toDateString() && currentSlot <= now) {
            currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
            continue;
          }
          
          if (isSlotAvailable(currentSlot, treatmentDuration, appointments)) {
            slots.push(new Date(currentSlot));
          }
          
          currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
        }
        
        console.log('Generated default slots:', slots.length);
        return slots;
      }
      
      console.log('📅 Barber availability:', dayAvailability.startTime, 'to', dayAvailability.endTime);
      
      const appointments = await getBarberAppointmentsForDay(barberId, date);
      console.log('Found', appointments.length, 'appointments for this day');
      
      const slots = [];
      
      // Parse barber's working hours
      const [startHour, startMin] = dayAvailability.startTime.split(':').map(Number);
      const [endHour, endMin] = dayAvailability.endTime.split(':').map(Number);
      
      // Generate time slots every [treatmentDuration] minutes within working hours
      const startTime = new Date(date);
      startTime.setHours(startHour, startMin, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, endMin, 0, 0);
      
      const currentSlot = new Date(startTime);
      
      while (currentSlot < endTime) {
        // Check if slot + treatment duration fits within working hours
        const slotEnd = new Date(currentSlot.getTime() + treatmentDuration * 60000);
        if (slotEnd > endTime) {
          break;
        }
        
        // Skip past times if it's today
        const now = new Date();
        if (date.toDateString() === now.toDateString() && currentSlot <= now) {
          currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
          continue;
        }
        
        if (isSlotAvailable(currentSlot, treatmentDuration, appointments)) {
          slots.push(new Date(currentSlot));
        }
        
        currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
      }
      
      console.log('Generated', slots.length, 'available time slots');
      console.log('Available times:', slots.map(s => `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')}`));
      
      return slots;
    } catch (error) {
      console.error('Error generating available slots:', error);
      return [];
    }
  }

  const generateAvailableTimes = async () => {
    if (!selectedBarber || !selectedDate || !selectedTreatment) return;
    
    const slots = await generateAvailableSlots(selectedBarber.id, selectedDate, selectedTreatment.duration);
    const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setAvailableTimes(timeStrings);
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
    // If we already have a selected date, generate times now
    if (selectedDate && selectedBarber) {
      generateAvailableSlots(selectedBarber.id, selectedDate, treatment.duration).then(slots => {
        const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setAvailableTimes(timeStrings);
      });
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setCurrentStep(4);
    if (selectedBarber && selectedTreatment) {
      try {
        const slots = await generateAvailableSlots(selectedBarber.id, date, selectedTreatment.duration);
        const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        
        // If no slots available, show basic times as fallback but filter out taken ones
        if (timeStrings.length === 0) {
          console.log('No slots available, using fallback times');
          const fallbackTimes = [];
          
          // Get existing appointments for filtering
          const existingAppointments = await getBarberAppointmentsForDay(selectedBarber.id, date);
          
          for (let hour = 9; hour <= 18; hour++) {
            const timeSlots = [
              `${hour.toString().padStart(2, '0')}:00`,
              hour < 18 ? `${hour.toString().padStart(2, '0')}:30` : null
            ].filter(Boolean);
            
            for (const timeSlot of timeSlots) {
              // Check if this time slot is available
              const slotDateTime = new Date(date);
              const [slotHour, slotMin] = timeSlot.split(':').map(Number);
              slotDateTime.setHours(slotHour, slotMin, 0, 0);
              
              if (isSlotAvailable(slotDateTime, selectedTreatment.duration, existingAppointments)) {
                fallbackTimes.push(timeSlot);
              }
            }
          }
          
          console.log('Filtered fallback times:', fallbackTimes);
          setAvailableTimes(fallbackTimes);
        } else {
          setAvailableTimes(timeStrings);
        }
      } catch (error) {
        console.error('Error generating slots, using fallback:', error);
        // Fallback to basic times but filter out taken ones
        const fallbackTimes = [];
        
        try {
          // Get existing appointments for filtering
          const existingAppointments = await getBarberAppointmentsForDay(selectedBarber.id, date);
          
          for (let hour = 9; hour <= 18; hour++) {
            const timeSlots = [
              `${hour.toString().padStart(2, '0')}:00`,
              hour < 18 ? `${hour.toString().padStart(2, '0')}:30` : null
            ].filter(Boolean);
            
            for (const timeSlot of timeSlots) {
              // Check if this time slot is available
              const slotDateTime = new Date(date);
              const [slotHour, slotMin] = timeSlot.split(':').map(Number);
              slotDateTime.setHours(slotHour, slotMin, 0, 0);
              
              if (isSlotAvailable(slotDateTime, selectedTreatment.duration, existingAppointments)) {
                fallbackTimes.push(timeSlot);
              }
            }
          }
          
          console.log('Error fallback - filtered times:', fallbackTimes);
        } catch (innerError) {
          console.error('Error in fallback filtering:', innerError);
          // Last resort - show basic times
          for (let hour = 9; hour <= 18; hour++) {
            fallbackTimes.push(`${hour.toString().padStart(2, '0')}:00`);
            if (hour < 18) {
              fallbackTimes.push(`${hour.toString().padStart(2, '0')}:30`);
            }
          }
        }
        
        setAvailableTimes(fallbackTimes);
      }
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert(t('common.error'), t('booking.login_required'));
      onNavigate('profile');
      return;
    }

    if (!selectedBarber || !selectedTreatment || !selectedDate || !selectedTime) {
      Alert.alert(t('common.error'), t('booking.select_all_details'));
      return;
    }

    setBooking(true);
    try {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      console.log('Creating appointment:', {
        barberId: selectedBarber.id,
        date: appointmentDateTime.toISOString(),
        duration: selectedTreatment.duration
      });

      // Double-check availability before creating appointment
      const existingAppointments = await getBarberAppointmentsForDay(selectedBarber.id, selectedDate);
      const isStillAvailable = isSlotAvailable(appointmentDateTime, selectedTreatment.duration, existingAppointments);
      
      if (!isStillAvailable) {
        Alert.alert(
          t('booking.slot_taken'),
          t('booking.slot_taken_message'),
          [{ text: t('common.confirm'), style: 'default' }]
        );
        setBooking(false);
        setShowConfirmModal(false);
        // Refresh available times
        if (selectedBarber && selectedTreatment) {
          const slots = await generateAvailableSlots(selectedBarber.id, selectedDate, selectedTreatment.duration);
          const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setAvailableTimes(timeStrings);
        }
        return;
      }

      await createAppointment({
        userId: user.uid,
        barberId: selectedBarber.id,
        treatmentId: selectedTreatment.id,
        date: Timestamp.fromDate(appointmentDateTime),
        duration: selectedTreatment.duration, // Save duration!
        status: 'confirmed' // Changed from 'pending' to 'confirmed' - auto-approve appointments
      });

      console.log('Appointment created successfully');
      setShowConfirmModal(false);
      setSuccessMessage(t('booking.appointment_details', { 
        date: selectedDate.toLocaleDateString('he-IL'), 
        time: selectedTime 
      }));
      setShowSuccessModal(true);

      // אחרי יצירת התור בהצלחה:
      if (selectedDate && selectedTime && selectedTreatment) {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const appointmentDate = new Date(selectedDate);
        appointmentDate.setHours(hours, minutes, 0, 0);
        await scheduleAppointmentReminders(appointmentDate, selectedTreatment.name);
      }

    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert(t('common.error'), t('booking.booking_error'));
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

  // פונקציה לתזמון התראות פוש ללקוח שעה ורבע שעה לפני התור
  const scheduleAppointmentReminders = async (appointmentDate: Date, treatmentName: string) => {
    // Calculate seconds until notification
    const now = new Date();
    const hourBefore = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
    const quarterBefore = new Date(appointmentDate.getTime() - 15 * 60 * 1000);

    const secondsUntilHour = Math.floor((hourBefore.getTime() - now.getTime()) / 1000);
    const secondsUntilQuarter = Math.floor((quarterBefore.getTime() - now.getTime()) / 1000);

    // Only schedule if in the future
    if (secondsUntilHour > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'תזכורת לתור! 💈',
          body: `יש לך תור ל-${treatmentName} בעוד שעה!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { seconds: secondsUntilHour, repeats: false, channelId: 'default' },
      });
    }
    if (secondsUntilQuarter > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'תזכורת לתור! 💈',
          body: `יש לך תור ל-${treatmentName} בעוד רבע שעה!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { seconds: secondsUntilQuarter, repeats: false, channelId: 'default' },
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title={t('booking.title')} 
          onBellPress={() => {}} 
          onMenuPress={() => {}} 
          showBackButton={true}
          onBackPress={onBack}
          showCloseButton={true}
          onClosePress={onClose}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title={t('booking.title')} 
        onBellPress={() => {}} 
        onMenuPress={() => {}} 
        showBackButton={true}
        onBackPress={onBack}
        showCloseButton={true}
        onClosePress={onClose}
      />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / 4) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{t('booking.step_of', { current: currentStep, total: 4 })}</Text>
      </View>

      {/* Step Header */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
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
                  <LinearGradient
                    colors={['#1a1a1a', '#000000', '#1a1a1a']}
                    style={styles.barberGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.barberImage}>
                      {barber.image ? (
                        <Image
                          source={{ uri: barber.image }}
                          style={styles.barberPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.barberPlaceholder}>✂️</Text>
                      )}
                    </View>
                    <Text style={styles.barberName}>{barber.name}</Text>
                    <Text style={styles.barberExperience}>{barber.experience}</Text>
                    <TouchableOpacity style={styles.detailsButton} onPress={() => setDetailsBarber(barber)}>
                      <Text style={styles.detailsButtonText}>{t('booking.details')}</Text>
                    </TouchableOpacity>
                    {!barber.available && (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>{t('booking.unavailable')}</Text>
                      </View>
                    )}
                  </LinearGradient>
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
                  <LinearGradient
                    colors={['#1a1a1a', '#000000', '#1a1a1a']}
                    style={styles.treatmentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.treatmentImage}>
                      <Text style={styles.treatmentPlaceholder}>💇</Text>
                    </View>
                    <View style={styles.treatmentInfo}>
                      <Text style={styles.treatmentName}>{treatment.name}</Text>
                      <Text style={styles.treatmentDescription}>{treatment.description}</Text>
                      <View style={styles.treatmentDetails}>
                        <Text style={styles.treatmentPrice}>{t('booking.price', { price: treatment.price })}</Text>
                        <Text style={styles.treatmentDuration}>{t('booking.duration', { duration: treatment.duration })}</Text>
                      </View>
                    </View>
                  </LinearGradient>
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
                  <LinearGradient
                    colors={['#1a1a1a', '#000000', '#1a1a1a']}
                    style={styles.dateGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                    <Text style={styles.dateNumber}>{date.getDate()}</Text>
                  </LinearGradient>
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
                  <LinearGradient
                    colors={['#1a1a1a', '#000000', '#1a1a1a']}
                    style={styles.timeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.timeText}>{time}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Selected Summary */}
        {currentStep > 1 && (
          <View style={styles.summaryContainer}>
            <LinearGradient
              colors={['#1a1a1a', '#000000', '#1a1a1a']}
              style={styles.summaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.summaryTitle}>{t('booking.booking_summary')}</Text>
              
              {selectedBarber && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.barber')}</Text>
                  <Text style={styles.summaryValue}>{selectedBarber.name}</Text>
                </View>
              )}
              
              {selectedTreatment && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.treatment')}</Text>
                  <Text style={styles.summaryValue}>{selectedTreatment.name}</Text>
                </View>
              )}
              
              {selectedDate && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.date')}</Text>
                  <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
                </View>
              )}
              
              {selectedTime && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.time')}</Text>
                  <Text style={styles.summaryValue}>{selectedTime}</Text>
                </View>
              )}
            </LinearGradient>
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
            <Text style={styles.modalTitle}>{t('booking.confirm_booking')}</Text>
            
            <View style={styles.confirmationDetails}>
              <Text style={styles.confirmationText}>
                {t('booking.barber')} {selectedBarber?.name}
              </Text>
              <Text style={styles.confirmationText}>
                {t('booking.treatment')} {selectedTreatment?.name}
              </Text>
              <Text style={styles.confirmationText}>
                {t('booking.date')} {selectedDate && formatDate(selectedDate)}
              </Text>
              <Text style={styles.confirmationText}>
                {t('booking.time')} {selectedTime}
              </Text>
              <Text style={styles.confirmationPrice}>
                {t('booking.price', { price: selectedTreatment?.price })}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmBooking}
                disabled={booking}
              >
                <Text style={styles.confirmButtonText}>
                  {booking ? t('common.loading') : t('booking.confirm_booking')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
                disabled={booking}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barber Details Modal */}
      <Modal
        visible={!!detailsBarber}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsBarber(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 320, alignItems: 'center' }}>
            {detailsBarber?.image && (
              <Image source={{ uri: detailsBarber.image }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }} />
            )}
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 6 }}>{detailsBarber?.name}</Text>
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>{detailsBarber?.experience}</Text>
            {detailsBarber?.phone && (
              <Text style={{ fontSize: 16, color: '#3b82f6', marginBottom: 8 }}>{t('profile.phone')} {detailsBarber.phone}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {/* אייקון וואטסאפ */}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 20 }}>🟢</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setDetailsBarber(null)} style={{ marginTop: 18 }}>
              <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          resetBooking();
          onNavigate('profile');
        }}
        title={t('booking.appointment_booked')}
        message={successMessage}
        type="success"
        icon="checkmark-circle"
        confirmText={t('profile.view_all')}
        onConfirm={() => {
          setShowSuccessModal(false);
          resetBooking();
          onNavigate('profile');
        }}
      />
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
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  barberGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  barberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  barberPlaceholder: {
    fontSize: 30,
    color: '#fff',
  },
  barberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  barberExperience: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
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
  barberPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 6,
  },
  treatmentsContainer: {
    marginBottom: 16,
  },
  treatmentCard: {
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  treatmentGradient: {
    padding: 20,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  treatmentImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  treatmentPlaceholder: {
    fontSize: 30,
    color: '#fff',
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'right',
  },
  treatmentDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
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
    color: '#fff',
  },
  treatmentDuration: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dateCard: {
    width: (width - 48) / 2,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  dateGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeCard: {
    width: (width - 60) / 3,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  timeGradient: {
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryContainer: {
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    color: 'rgba(255,255,255,0.8)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
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
  detailsButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BookingScreen; 