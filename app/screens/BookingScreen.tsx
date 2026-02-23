import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, getFirestore, onSnapshot, query, QuerySnapshot, Timestamp, where } from 'firebase/firestore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Animated,
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
import { CacheUtils } from '../../services/cache';
import {
    Barber,
    createAppointment,
    createWaitlistEntry,
    getBarberAppointmentsForDay,
    getBarberAvailableSlots,
    getBarbers,
    getCurrentUser,
    getTreatments,
    getUserProfile,
    subscribeToTreatmentsChanges,
    Treatment
} from '../../services/firebase';
import ConfirmationModal from '../components/ConfirmationModal';
import { ScissorsLoader } from '../components/ScissorsLoader';
import TopNav from '../components/TopNav';
import { generateTimeSlots, getSlotsNeeded, SLOT_SIZE_MINUTES, toMin, toYMD } from '../constants/scheduling';

const { width } = Dimensions.get('window');

let bookingDataMemory: { barbers: Barber[]; treatments: Treatment[] } | null = null;

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

// Optimized Image Component with lazy loading
const OptimizedImage = memo(({ source, style, resizeMode = 'cover' }: {
  source: any;
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <View style={[style, { backgroundColor: '#f0f0f0' }]}>
      {!isLoaded && !hasError && (
        <View style={[style, { 
          position: 'absolute', 
          backgroundColor: '#f0f0f0', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }]}>
          <ScissorsLoader size={14} color="#007bff" accessibilityLabel="טוען תמונה" />
        </View>
      )}
      <Image
        source={source}
        style={[style, { opacity: isLoaded ? 1 : 0 }]}
        resizeMode={resizeMode}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        fadeDuration={200}
      />
    </View>
  );
});
OptimizedImage.displayName = 'OptimizedImage';

const BookingScreen: React.FC<BookingScreenProps> = ({ onNavigate, onBack, onClose, route }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [barbers, setBarbers] = useState<Barber[]>(() => bookingDataMemory?.barbers || []);
  const [treatments, setTreatments] = useState<Treatment[]>(() => bookingDataMemory?.treatments || []);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [weeklyAvailability, setWeeklyAvailability] = useState<{[key: number]: string[]}>({});
  const [dateSpecificAvailability, setDateSpecificAvailability] = useState<{[date: string]: string[] | null}>({});
  const [availableDates, setAvailableDates] = useState<{date: Date, isAvailable: boolean, dayOfWeek: number}[]>([]);
  const [loading, setLoading] = useState(() => !bookingDataMemory);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detailsBarber, setDetailsBarber] = useState<Barber | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistTimeStart, setWaitlistTimeStart] = useState('09:00');
  const [waitlistTimeEnd, setWaitlistTimeEnd] = useState('18:00');
  const barberFadeAnims = React.useRef<Animated.Value[]>([]);

  const preSelectedBarberId = route?.params?.barberId;

  // Locale-independent time helpers.
  // We must NOT use toLocaleTimeString() for slot strings because some devices emit "2:00 PM",
  // which breaks parsing (minutes -> NaN) and can lead to "date value out of bounds" when creating Firestore Timestamps.
  const toHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const parseHHMM = (time: string) => {
    const [hhStr, mmStr] = String(time || '').split(':');
    const hours = Number(hhStr);
    const minutes = Number(mmStr);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  };

  const loadData = useCallback(async () => {
    try {
      if (!bookingDataMemory) {
        const [cachedBarbers, cachedTreatments] = await Promise.all([
          CacheUtils.getBarbers(),
          CacheUtils.getTreatments(),
        ]);
        if (
          Array.isArray(cachedBarbers) &&
          cachedBarbers.length > 0 &&
          Array.isArray(cachedTreatments) &&
          cachedTreatments.length > 0
        ) {
          setBarbers(cachedBarbers as Barber[]);
          setTreatments(cachedTreatments as Treatment[]);
          bookingDataMemory = {
            barbers: cachedBarbers as Barber[],
            treatments: cachedTreatments as Treatment[],
          };
          setLoading(false);
        }
      }

      const [barbersData, treatmentsData] = await Promise.all([
        getBarbers(),
        getTreatments()
      ]);
      
      setBarbers(barbersData);
      setTreatments(treatmentsData);
      bookingDataMemory = { barbers: barbersData, treatments: treatmentsData };
      CacheUtils.setBarbers(barbersData, 30).catch(() => undefined);
      CacheUtils.setTreatments(treatmentsData, 60).catch(() => undefined);
      
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
  }, [preSelectedBarberId]);

  // Removed auto-creation. Customer view now reflects EXACTLY what admin saved.

  const refreshAvailability = async () => {
    if (!selectedBarber) return;
    
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing availability for barber:', selectedBarber.id);
      console.log('🗓️ TODAY\'S DATE FOR SYNC TEST:', new Date().toLocaleDateString());
      const todayDayOfWeek = new Date().getDay();
      console.log('🗓️ TODAY\'S DAY OF WEEK:', todayDayOfWeek);
      
      // No auto-creation here. We only read what's in dailyAvailability.
      
      const db = getFirestore();
      
      // Load DAILY availability first (has priority) - next 14 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateSpecificSlots: {[date: string]: string[] | null} = {};

      for (let i = 0; i <= 14; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = toYMD(checkDate); // CRITICAL FIX: Use toYMD to avoid UTC timezone issues
        
        // Query for ANY dailyAvailability record (not just isAvailable=true)
        const dailyQuery = query(
          collection(db, 'dailyAvailability'),
          where('barberId', '==', selectedBarber.id),
          where('date', '==', dateStr)
        );
        
        const dailySnapshot = await getDocs(dailyQuery);
        dailySnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          if (data.isAvailable === false) {
            // Explicitly unavailable - mark as null to override weekly
            dateSpecificSlots[dateStr] = null;
            console.log('🚫 DATE EXPLICITLY UNAVAILABLE:', dateStr);
          } else if (data.isAvailable && data.availableSlots && Array.isArray(data.availableSlots)) {
            dateSpecificSlots[dateStr] = data.availableSlots;
            console.log('✅ DATE-SPECIFIC: Found slots for', dateStr, ':', data.availableSlots);
          }
        });
      }
      
      // Load WEEKLY availability as fallback
      const weeklyQuery = query(
        collection(db, 'availability'),
        where('barberId', '==', selectedBarber.id),
        where('isAvailable', '==', true)
      );

      const weeklySnapshot = await getDocs(weeklyQuery);
      const weeklySlots: {[key: number]: string[]} = {};

      weeklySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const dayOfWeek = data.dayOfWeek;
        console.log('🔍 WEEKLY FALLBACK: docId=' + doc.id + ', dayOfWeek=' + dayOfWeek);

        if (data.isAvailable) {
          let slots = [];

          if (data.availableSlots && Array.isArray(data.availableSlots)) {
            slots = data.availableSlots;
            console.log('✅ WEEKLY FALLBACK: Using slots for dayOfWeek', dayOfWeek, ':', slots);
          } else if (data.startTime && data.endTime) {
            const startTime = data.startTime;
            const endTime = data.endTime;
            const [startHour] = startTime.split(':').map(Number);
            const [endHour] = endTime.split(':').map(Number);
            slots = generateTimeSlots(startHour, endHour);
            console.log('⚠️ Generated fallback slots from time range:', slots);
          }

          if (slots.length > 0) {
            weeklySlots[dayOfWeek] = [...slots];
          }
        }
      });

      // NEW APPROACH: We now work ONLY with daily availability, no more weekly!
      // Build availability per dayOfWeek from the CURRENT date-specific slots
      const finalWeeklySlots: {[key: number]: string[]} = {};
      
      for (let i = 0; i <= 14; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = toYMD(checkDate); // CRITICAL FIX: Use toYMD to avoid UTC timezone issues
        const dayOfWeek = checkDate.getDay();
        
        // ONLY use date-specific slots (no weekly fallback!)
        if (dateStr in dateSpecificSlots) {
          const dateSlots = dateSpecificSlots[dateStr];
          
          if (dateSlots === null) {
            // Explicitly unavailable
            console.log(`🚫 ${dateStr} (${dayOfWeek}) explicitly UNAVAILABLE`);
            // Don't add to finalWeeklySlots
          } else if (dateSlots && dateSlots.length > 0) {
            // Use this date's slots for this dayOfWeek
            // NOTE: If there are multiple same days with different slots, last one wins
            // This is OK because each specific date will be checked individually
            finalWeeklySlots[dayOfWeek] = dateSlots;
            console.log(`✅ ${dateStr} (${dayOfWeek}): ${dateSlots.length} slots from dailyAvailability`);
          }
        } else {
          // No data for this date - mark as unavailable
          console.log(`⚠️ ${dateStr} (${dayOfWeek}): No dailyAvailability found`);
        }
      }

      // Remove duplicates and sort for each day
      Object.keys(finalWeeklySlots).forEach(day => {
        finalWeeklySlots[parseInt(day)] = [...new Set(finalWeeklySlots[parseInt(day)])].sort();
      });

      console.log('✅ Refreshed availability (DAILY-ONLY model):', finalWeeklySlots);
      console.log('📊 Date-specific slots loaded:', Object.keys(dateSpecificSlots).length, 'dates');
      
      // Save both for backwards compatibility
      setWeeklyAvailability(finalWeeklySlots);
      setDateSpecificAvailability(dateSpecificSlots); // CRITICAL: Store date-specific data!
      
      // Update available dates
      const dates = generateAvailableDates();
      console.log('📅 Generated available dates after refresh:', dates.map(d => ({
        date: toYMD(d.date), // CRITICAL FIX: Use toYMD to avoid timezone issues
        dayOfWeek: d.dayOfWeek,
        isAvailable: d.isAvailable
      })));
      setAvailableDates(dates);
      
      // If we have a selected date and treatment, update available times
      if (selectedDate && selectedTreatment) {
        const slots = await generateAvailableSlots(selectedBarber.id, selectedDate, selectedTreatment.duration);
        const timeStrings = slots.map(toHHMM);
        setAvailableTimes(timeStrings);
      }
      
      Alert.alert('עודכן', 'הזמינות עודכנה בהצלחה!');
    } catch (error) {
      console.error('Error refreshing availability:', error);
      Alert.alert('שגיאה', 'שגיאה בעדכון הזמינות');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentStep !== 1 || barbers.length === 0) return;

    barberFadeAnims.current = barbers.map(
      (_, index) => barberFadeAnims.current[index] || new Animated.Value(0)
    );
    barberFadeAnims.current.forEach((anim) => anim.setValue(0));

    Animated.stagger(
      70,
      barberFadeAnims.current.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [barbers, currentStep]);

  // Load availability immediately when barber is selected (so step 3 shows real data; listener keeps it real-time)
  const loadInitialAvailability = useCallback(async (barber: Barber) => {
    try {
      const db = getFirestore();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateSpecificSlots: {[date: string]: string[] | null} = {};

      for (let i = 0; i <= 14; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = toYMD(checkDate);
        const dailyQuery = query(
          collection(db, 'dailyAvailability'),
          where('barberId', '==', barber.id),
          where('date', '==', dateStr)
        );
        const dailySnapshot = await getDocs(dailyQuery);
        dailySnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.isAvailable === false) {
            dateSpecificSlots[dateStr] = null;
          } else if (data.isAvailable && data.availableSlots && Array.isArray(data.availableSlots)) {
            dateSpecificSlots[dateStr] = data.availableSlots;
          }
        });
      }

      const finalWeeklySlots: {[key: number]: string[]} = {};
      for (let i = 0; i <= 14; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = toYMD(checkDate);
        const dayOfWeek = checkDate.getDay();
        if (dateStr in dateSpecificSlots) {
          const dateSlots = dateSpecificSlots[dateStr];
          if (dateSlots !== null && dateSlots.length > 0) {
            finalWeeklySlots[dayOfWeek] = dateSlots;
          }
        }
      }
      Object.keys(finalWeeklySlots).forEach(day => {
        finalWeeklySlots[parseInt(day)] = [...new Set(finalWeeklySlots[parseInt(day)])].sort();
      });

      setWeeklyAvailability(finalWeeklySlots);
      setDateSpecificAvailability(dateSpecificSlots);

      // Build available dates from the fetched slots (state not updated yet)
      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);
      const dates: { date: Date; isAvailable: boolean; dayOfWeek: number }[] = [];
      for (let i = 0; i <= 14; i++) {
        const date = new Date(todayObj);
        date.setDate(todayObj.getDate() + i);
        const dateStr = toYMD(date);
        const dayOfWeek = date.getDay();
        const dateSlots = dateSpecificSlots[dateStr];
        const isAvailable = dateSlots !== null && Array.isArray(dateSlots) && dateSlots.length > 0;
        dates.push({ date, isAvailable, dayOfWeek });
      }
      setAvailableDates(dates);
    } catch (e) {
      console.error('Error loading initial availability:', e);
    }
  }, []);

  useEffect(() => {
    if (selectedBarber) {
      loadInitialAvailability(selectedBarber);
    }
  }, [selectedBarber?.id, loadInitialAvailability]);

  // Listen to availability changes in real-time (DAILY AVAILABILITY)
  useEffect(() => {
    if (selectedBarber) {
      console.log('🔔 Setting up DAILY availability listener for barber:', selectedBarber.id);

      const db = getFirestore();
      const dailyQuery = query(
        collection(db, 'dailyAvailability'),
        where('barberId', '==', selectedBarber.id)
      );

      // Real-time listener for dailyAvailability changes
      const unsubscribe = onSnapshot(dailyQuery, async (snapshot: QuerySnapshot) => {
        console.log('📡 Daily availability updated! Processing', snapshot.docs.length, 'documents');

        // No auto-creation here. Only reflect existing dailyAvailability.

        // Rebuild dateSpecificAvailability from snapshot
        const dateSpecificSlots: {[date: string]: string[] | null} = {};

        snapshot.docs.forEach(doc => {
          const data = doc.data();

          if (data.date) {
            if (data.isAvailable === false) {
              // Explicitly unavailable
              dateSpecificSlots[data.date] = null;
              console.log('🚫 Real-time: Date explicitly unavailable:', data.date);
            } else if (data.isAvailable && data.availableSlots && Array.isArray(data.availableSlots)) {
              dateSpecificSlots[data.date] = data.availableSlots;
              console.log('✅ Real-time: Date-specific slots for', data.date, ':', data.availableSlots.length, 'slots');
            }
          }
        });

        console.log('📊 Real-time: Updated dateSpecificAvailability with', Object.keys(dateSpecificSlots).length, 'dates');
        setDateSpecificAvailability(dateSpecificSlots);

        // Build available dates from new slots (state not updated yet)
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        const dates: { date: Date; isAvailable: boolean; dayOfWeek: number }[] = [];
        for (let i = 0; i <= 14; i++) {
          const date = new Date(todayObj);
          date.setDate(todayObj.getDate() + i);
          const dateStr = toYMD(date);
          const dayOfWeek = date.getDay();
          const dateSlots = dateSpecificSlots[dateStr];
          const isAvailable = dateSlots !== null && Array.isArray(dateSlots) && dateSlots.length > 0;
          dates.push({ date, isAvailable, dayOfWeek });
        }
        console.log('📅 Real-time: Regenerated available dates');
        setAvailableDates(dates);

        // If we have a selected date and treatment, update available times
        if (selectedDate && selectedTreatment) {
          console.log('🔄 Real-time: Regenerating available times for selected date');
          generateAvailableSlots(selectedBarber.id, selectedDate, selectedTreatment.duration).then(slots => {
            const timeStrings = slots.map(toHHMM);
            console.log('🔄 Real-time: Updated available times:', timeStrings.length, 'slots');
            setAvailableTimes(timeStrings);
          });
        }
      });

      return () => {
        console.log('🔕 Unsubscribing from daily availability changes');
        unsubscribe();
      };
    }
  }, [selectedBarber, selectedDate, selectedTreatment]);

  // Listen to treatments changes in real-time
  useEffect(() => {
    console.log('🔔 Setting up treatments listener');
    
    const unsubscribe = subscribeToTreatmentsChanges((treatments) => {
      console.log('📡 Treatments updated:', treatments.length, 'treatments');
      setTreatments(treatments);
    });
    
    return () => {
      console.log('🔕 Unsubscribing from treatments changes');
      unsubscribe();
    };
  }, []);

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
        
        const apptDuration = appt.duration || 25; // Default 25min
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
      // CRITICAL FIX: Use toYMD to avoid timezone issues (especially after midnight)
      const dateString = toYMD(date);
      const [Y, M, D] = dateString.split('-').map(Number);
      const dayOfWeek = new Date(Y, M - 1, D).getDay();

      // Use real-time availability data if available
      let availableTimeSlots: string[] = [];

      console.log('🔍 generateAvailableSlots - dateString:', dateString);
      console.log('🔍 generateAvailableSlots - dateSpecificAvailability state:', dateSpecificAvailability);
      console.log('🔍 generateAvailableSlots - dateSpecificAvailability[' + dateString + ']:', dateSpecificAvailability[dateString]);

      // PRIORITY 1: Check date-specific availability first
      if (dateString in dateSpecificAvailability) {
        const dateSlots = dateSpecificAvailability[dateString];
        if (dateSlots === null) {
          console.log('🚫 Date explicitly UNAVAILABLE');
          return [];
        } else if (dateSlots && dateSlots.length > 0) {
          console.log('✅ Using DATE-SPECIFIC availability:', dateSlots.length, 'slots');
          availableTimeSlots = dateSlots;
        } else {
          console.log('⚠️ Date has no slots');
          return [];
        }
      } else {
        // FALLBACK: Load from database
        console.log('📅 Loading availability from database (not in real-time state)');
        availableTimeSlots = await getBarberAvailableSlots(barberId, dateString);
        console.log('📅 Database slots loaded:', availableTimeSlots.length, 'slots');
      }
      
      if (availableTimeSlots.length === 0) {
        console.log('❌ Barber not available on this day - NO SLOTS AVAILABLE');
        return [];
      }
      
      console.log('📅 Available time slots:', availableTimeSlots);
      
      const appointments = await getBarberAppointmentsForDay(barberId, date);
      console.log('Found', appointments.length, 'appointments for this day');
      
      const slots = [];
      
      // Use ALL admin slots - no artificial cutoff
      // Admin controls what slots are available, not the booking screen
      const validSlots = availableTimeSlots.filter(slot => {
        // Only filter by treatment duration fit, not by arbitrary dayEnd
        const startMinutes = toMin(slot);
        const endMinutes = startMinutes + treatmentDuration;

        // Check if slot + treatment fits within the same day (before midnight)
        return endMinutes <= 24 * 60; // 24:00 = midnight
      });
      
      // Convert time strings to Date objects and check availability
      for (const timeString of validSlots) {
        const [hour, minute] = timeString.split(':').map(Number);
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        // Skip past times if it's today
        const now = new Date();
        if (date.toDateString() === now.toDateString() && slotStart <= now) {
          continue;
        }
        
        // Check if slot + treatment duration fits within the time slot
        const slotEnd = new Date(slotStart.getTime() + treatmentDuration * 60000);
        const nextSlotStart = new Date(slotStart.getTime() + SLOT_SIZE_MINUTES * 60000); // Next 25-min slot
        
        // For treatments longer than 25 minutes, we need to check if there are enough consecutive slots
        if (treatmentDuration > SLOT_SIZE_MINUTES) {
          // Check if we have enough consecutive 25-minute slots for the treatment
          const requiredSlots = getSlotsNeeded(treatmentDuration);
          let hasEnoughSlots = true;

          for (let i = 0; i < requiredSlots; i++) {
            const checkSlotStart = new Date(slotStart.getTime() + (i * SLOT_SIZE_MINUTES * 60000));

            // Check if this 25-minute slot is available
            if (!isSlotAvailable(checkSlotStart, SLOT_SIZE_MINUTES, appointments)) {
              hasEnoughSlots = false;
              break;
            }
          }
          
          if (hasEnoughSlots && isSlotAvailable(slotStart, treatmentDuration, appointments)) {
            slots.push(slotStart);
          }
        } else {
          // For treatments 25 minutes or less, use the original logic
          if (slotEnd <= nextSlotStart && isSlotAvailable(slotStart, treatmentDuration, appointments)) {
            slots.push(slotStart);
          }
        }
      }
      
      console.log('Generated', slots.length, 'available time slots');
      console.log('Available times:', slots.map(s => `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')}`));
      
      return slots;
    } catch (error) {
      console.error('Error generating available slots:', error);
      return [];
    }
  }


  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    // Start from today (i = 0) and go up to 14 days
    for (let i = 0; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Check if this SPECIFIC DATE is available
      // CRITICAL FIX: Use toYMD to avoid timezone issues (especially after midnight)
      const dateStr = toYMD(date);
      const [Y, M, D] = dateStr.split('-').map(Number);
      const dayOfWeek = new Date(Y, M - 1, D).getDay();
      
      // CRITICAL: Check date-specific availability ONLY (no weekly fallback!)
      let isAvailable = false;
      if (selectedBarber) {
        if (dateStr in dateSpecificAvailability) {
          const dateSlots = dateSpecificAvailability[dateStr];
          // Available only if there are actual slots (not null or empty)
          isAvailable = dateSlots !== null && Array.isArray(dateSlots) && dateSlots.length > 0;
          console.log(`📅 ${dateStr}: ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'} (${dateSlots === null ? 'explicitly disabled' : dateSlots?.length || 0} slots)`);
        } else {
          // No data for this date - not available
          isAvailable = false;
          console.log(`📅 ${dateStr}: No dailyAvailability found - UNAVAILABLE`);
        }
      } else {
        isAvailable = true; // No barber selected yet
      }
      
      dates.push({
        date,
        isAvailable,
        dayOfWeek
      });
    }
    
    return dates;
  };

  const handleBarberSelect = async (barber: Barber) => {
    setSelectedBarber(barber);
    setCurrentStep(2);
    
    // No auto-creation. Customer reflects admin exactly.
  };

  const handleTreatmentSelect = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setCurrentStep(3);
    // If we already have a selected date, generate times now
    if (selectedDate && selectedBarber) {
      generateAvailableSlots(selectedBarber.id, selectedDate, treatment.duration).then(slots => {
        const timeStrings = slots.map(toHHMM);
        setAvailableTimes(timeStrings);
      });
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setCurrentStep(4);
    // CRITICAL FIX: Use toYMD to avoid timezone issues (especially after midnight)
    const dateStr = toYMD(date);
    const [Y, M, D] = dateStr.split('-').map(Number);
    const selectedDayOfWeek = new Date(Y, M - 1, D).getDay();
    console.log('🎯 DATE SELECTED: ' + dateStr + ' dayOfWeek=' + selectedDayOfWeek);
    console.log('🎯 DATE SELECTED: weeklyAvailability for this day:', weeklyAvailability[selectedDayOfWeek] || []);
    if (selectedBarber && selectedTreatment) {
      try {
        const slots = await generateAvailableSlots(selectedBarber.id, date, selectedTreatment.duration);
        const timeStrings = slots.map(toHHMM);
        console.log('🎯 DATE SELECTED: Final timeStrings generated:', timeStrings);
        
        // If no slots available, check if barber has availability for this day
        if (timeStrings.length === 0) {
          console.log('No slots available, checking barber availability');
          const dayOfWeek = date.getDay();
          const hasAvailability = weeklyAvailability[dayOfWeek] && weeklyAvailability[dayOfWeek].length > 0;
          
          if (!hasAvailability) {
            console.log('Barber not available on this day - no fallback times');
            setAvailableTimes([]);
          } else {
            console.log('Barber has availability but no slots generated - this might be a bug');
            setAvailableTimes([]);
          }
        } else {
          setAvailableTimes(timeStrings);
        }
      } catch (error) {
        console.error('Error generating slots:', error);
        // Don't use fallback times - respect admin's availability settings
        const dayOfWeek = date.getDay();
        const hasAvailability = weeklyAvailability[dayOfWeek] && weeklyAvailability[dayOfWeek].length > 0;
        
        if (!hasAvailability) {
          console.log('Barber not available on this day - no fallback times');
          setAvailableTimes([]);
        } else {
          console.log('Error generating slots but barber should be available - showing empty times');
          setAvailableTimes([]);
        }
      }
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowConfirmModal(true);
  };

  const handleWaitlistSubmit = async () => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('נדרש כניסה', 'יש להתחבר כדי להירשם לרשימת המתנה');
      setShowWaitlistModal(false);
      onNavigate('profile');
      return;
    }

    if (!selectedBarber || !selectedDate) {
      Alert.alert('שגיאה', 'נא לבחור ספר ותאריך');
      return;
    }

    try {
      // Get user profile for display name and phone
      const userProfile = await getUserProfile(user.uid);
      
      const dateStr = toYMD(selectedDate);
      
      await createWaitlistEntry({
        userId: user.uid,
        barberId: selectedBarber.id,
        date: dateStr,
        preferredTimeStart: waitlistTimeStart,
        preferredTimeEnd: waitlistTimeEnd,
        userDisplayName: userProfile?.displayName || user.displayName || 'אורח',
        userPhone: userProfile?.phone || '',
      });

      setShowWaitlistModal(false);
      Alert.alert(
        'נרשמת בהצלחה! ✅',
        `נרשמת לרשימת המתנה ליום ${selectedDate.toLocaleDateString('he-IL')} בין השעות ${waitlistTimeStart}-${waitlistTimeEnd}. נודיע לך ברגע שיתפנה תור!`,
        [{ text: 'אישור', style: 'default' }]
      );
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      Alert.alert('שגיאה', 'לא ניתן להירשם לרשימת המתנה כרגע');
    }
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
      const parsed = parseHHMM(selectedTime);
      if (!parsed) {
        throw new Error(`Invalid time value: ${selectedTime}`);
      }
      appointmentDateTime.setHours(parsed.hours, parsed.minutes, 0, 0);

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
          const timeStrings = slots.map(toHHMM);
          setAvailableTimes(timeStrings);
        }
        return;
      }

      console.log('📅 Creating appointment with userId:', user.uid);
      
      // Verify user exists in Firestore before creating appointment
      try {
        const { getUserProfile } = await import('../../services/firebase');
        const userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
          console.error(`❌ User ${user.uid} does not exist in Firestore!`);
          Alert.alert(
            t('common.error'),
            'שגיאה: המשתמש לא נמצא במערכת. נא להתחבר מחדש או ליצור קשר עם התמיכה.',
            [{ text: t('common.confirm'), onPress: () => onNavigate('profile') }]
          );
          setBooking(false);
          setShowConfirmModal(false);
          return;
        }
        console.log('✅ User profile verified:', userProfile.displayName);
      } catch (userCheckError: any) {
        console.error('❌ Error verifying user:', userCheckError);
        Alert.alert(
          t('common.error'),
          'שגיאה בבדיקת המשתמש. נא לנסות שוב.',
          [{ text: t('common.confirm') }]
        );
        setBooking(false);
        setShowConfirmModal(false);
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

      // createAppointment כבר מפעיל תזכורות (לוקאלי + Firestore Push) - אין צורך לקרוא שוב

    } catch (error: any) {
      console.error('❌ Error creating appointment:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Show more specific error message
      let errorMessage = t('booking.booking_error');
      if (error.message && error.message.includes('does not exist')) {
        errorMessage = 'שגיאה: המשתמש לא נמצא במערכת. נא להתחבר מחדש או ליצור קשר עם התמיכה.';
      } else if (error.message) {
        errorMessage = `שגיאה: ${error.message}`;
      }
      
      Alert.alert(t('common.error'), errorMessage);
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

  const formatDateDayOnly = (date: Date) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[date.getDay()];
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
          <ScissorsLoader size={60} color="#007bff" accessibilityLabel={t('common.loading')} />
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
        <Text
          style={[
            styles.stepTitle,
            currentStep === 1 && styles.stepTitleBookingRtlLeft,
          ]}
        >
          {getStepTitle()}
        </Text>
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
            <LinearGradient
              colors={['#ffffff', '#f7f7f8', '#f2f3f5']}
              style={styles.barberStage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.barbersGrid}>
                {barbers.map((barber, index) => {
                  const fadeAnim = barberFadeAnims.current[index];
                  return (
                    <Animated.View
                      key={barber.id}
                      style={[
                        styles.barberCircleItem,
                        fadeAnim
                          ? {
                              opacity: fadeAnim,
                              transform: [
                                {
                                  translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [16, 0],
                                  }),
                                },
                                {
                                  scale: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.96, 1],
                                  }),
                                },
                              ],
                            }
                          : null,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.barberCirclePressable}
                        onPress={() => handleBarberSelect(barber)}
                      >
                        <LinearGradient
                          colors={
                            selectedBarber?.id === barber.id
                              ? ['#f5d37a', '#c89f4d', '#f4dfae']
                              : ['#2c2c2c', '#131313', '#2a2a2a']
                          }
                          style={[
                            styles.barberCircleFrame,
                            selectedBarber?.id === barber.id && styles.barberCircleFrameSelected,
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.barberCircleInner}>
                            {barber.image ? (
                              <Image
                                source={{ uri: barber.image }}
                                style={styles.barberCirclePhoto}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={styles.barberPlaceholder}>✂️</Text>
                            )}
                          </View>
                        </LinearGradient>
                        <Text
                          style={[
                            styles.barberCircleName,
                            selectedBarber?.id === barber.id && styles.barberCircleNameSelected,
                          ]}
                        >
                          {barber.name}
                        </Text>
                        {!!barber.experience && (
                          <Text style={styles.barberCircleExperience}>{barber.experience}</Text>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </LinearGradient>
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
                    selectedTreatment?.id === treatment.id && styles.treatmentCardSelected
                  ]}
                  onPress={() => handleTreatmentSelect(treatment)}
                >
                  <View style={styles.treatmentGradient}>
                    <LinearGradient
                      colors={['rgba(255,215,130,0.08)', 'rgba(214,154,50,0.56)', 'rgba(255,223,150,0.2)']}
                      style={[
                        styles.treatmentCornerSlash,
                        styles.treatmentCornerLeft,
                        selectedTreatment?.id === treatment.id && styles.treatmentCornerLeftSelected,
                      ]}
                    />
                    <LinearGradient
                      colors={['rgba(255,212,120,0.14)', 'rgba(215,158,56,0.72)', 'rgba(255,224,160,0.28)']}
                      style={[
                        styles.treatmentCornerSlash,
                        styles.treatmentCornerRight,
                        selectedTreatment?.id === treatment.id && styles.treatmentCornerRightSelected,
                      ]}
                    />
                    <View
                      style={[
                        styles.treatmentAccent,
                        selectedTreatment?.id === treatment.id && styles.treatmentAccentSelected,
                      ]}
                    />
                    <View style={styles.treatmentInfo}>
                      <View style={styles.treatmentTopRow}>
                        <Text
                          style={[
                            styles.treatmentName,
                            selectedTreatment?.id === treatment.id && styles.treatmentNameSelected,
                          ]}
                        >
                          {treatment.name}
                        </Text>
                        <View
                          style={[
                            styles.treatmentTag,
                            selectedTreatment?.id === treatment.id && styles.treatmentTagSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.treatmentTagText,
                              selectedTreatment?.id === treatment.id && styles.treatmentTagTextSelected,
                            ]}
                          >
                            {selectedTreatment?.id === treatment.id ? 'נבחר' : 'לבחירה'}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.treatmentImage,
                          selectedTreatment?.id === treatment.id && styles.treatmentImageSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.treatmentPlaceholder,
                            selectedTreatment?.id === treatment.id && styles.treatmentPlaceholderSelected,
                          ]}
                        >
                          ✂️
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.treatmentDescription,
                          selectedTreatment?.id === treatment.id && styles.treatmentDescriptionSelected,
                        ]}
                      >
                        {treatment.description}
                      </Text>
                      <View style={styles.treatmentDetails}>
                        <View
                          style={[
                            styles.treatmentMetaChip,
                            selectedTreatment?.id === treatment.id && styles.treatmentMetaChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.treatmentPrice,
                              selectedTreatment?.id === treatment.id && styles.treatmentMetaTextSelected,
                            ]}
                          >
                            {t('booking.price', { price: treatment.price })}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.treatmentMetaChip,
                            selectedTreatment?.id === treatment.id && styles.treatmentMetaChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.treatmentDuration,
                              selectedTreatment?.id === treatment.id && styles.treatmentMetaTextSelected,
                            ]}
                          >
                            {t('booking.duration', { duration: treatment.duration })}
                          </Text>
                        </View>
                      </View>
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
            <View style={styles.selectionSummary}>
              <Text style={styles.selectionSummaryText}>
                בחרת את {selectedBarber?.name} ל{selectedTreatment?.name} ב
              </Text>
            </View>

            <View style={styles.datesListContainer}>
              {(availableDates.length > 0 ? availableDates : generateAvailableDates()).map((dateObj, index) => {
                const isToday = index === 0;
                const isTomorrow = index === 1;
                const dateLabel = isToday ? 'היום' : isTomorrow ? 'מחר' : formatDateDayOnly(dateObj.date);
                const dateNum = `${dateObj.date.getDate()}.${dateObj.date.getMonth() + 1}`;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateListItem,
                      selectedDate?.getTime() === dateObj.date.getTime() && styles.selectedDateListItem,
                    ]}
                    onPress={() => dateObj.isAvailable ? handleDateSelect(dateObj.date) : null}
                  >
                    <LinearGradient
                      colors={selectedDate?.getTime() === dateObj.date.getTime() 
                        ? ['#3b82f6', '#1d4ed8'] 
                        : ['#e0e0e0', '#ffffff']} // More noticeable gradient at the top
                      style={styles.dateListItemGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    >
                      <Text style={[
                        styles.dateListItemText,
                        selectedDate?.getTime() === dateObj.date.getTime() && { color: '#fff' },
                        !dateObj.isAvailable && styles.dateListItemTextUnavailable
                      ]}>
                        {dateLabel}, {dateNum}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#333' }]} />
                <Text style={styles.legendText}>יש תורים</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                <Text style={styles.legendText}>אין תורים</Text>
              </View>
            </View>

            <View style={styles.bottomActionsContainer}>
              <View style={styles.actionColumn}>
                <Text style={styles.actionLabel}>חייב תור דחוף?</Text>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.urgentButton]}
                  onPress={() => {
                    // Find first available date and select it
                    const firstAvail = availableDates.find(d => d.isAvailable);
                    if (firstAvail) handleDateSelect(firstAvail.date);
                  }}
                >
                  <Text style={styles.actionButtonText}>התורים הקרובים ביותר</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionColumn}>
                <Text style={styles.actionLabel}>לא מצאת תור לזמן שלך?</Text>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.waitlistButton]}
                  onPress={() => setShowWaitlistModal(true)}
                >
                  <Text style={styles.actionButtonText}>כניסה לרשימת המתנה</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Select Time */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <View style={styles.selectionSummary}>
              <Text style={styles.selectionSummaryText}>
                בחרת את {selectedBarber?.name} ל{selectedTreatment?.name}
              </Text>
              <Text style={styles.selectionSummarySubtext}>
                בתאריך: {selectedDate && formatDateDayOnly(selectedDate)}, {selectedDate && `${selectedDate.getDate()}.${selectedDate.getMonth() + 1}`}
              </Text>
            </View>
            
            {availableTimes.length === 0 ? (
              <View style={styles.noSlotsContainer}>
                <Text style={styles.noSlotsEmoji}>😔</Text>
                <Text style={styles.noSlotsTitle}>נתפסו כל התורים!</Text>
                <Text style={styles.noSlotsSubtitle}>אין שעות פנויות ביום זה</Text>
                <Text style={styles.noSlotsHint}>נסה לבחור תאריך אחר</Text>
              </View>
            ) : (
              <View style={styles.datesListContainer}>
                {availableTimes.map((time, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateListItem,
                      selectedTime === time && styles.selectedDateListItem
                    ]}
                    onPress={() => handleTimeSelect(time)}
                  >
                    <LinearGradient
                      colors={selectedTime === time 
                        ? ['#3b82f6', '#1d4ed8'] 
                        : ['#e0e0e0', '#ffffff']} // Same style as dates
                      style={styles.dateListItemGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    >
                      <Text style={[
                        styles.dateListItemText,
                        selectedTime === time && { color: '#fff' }
                      ]}>
                        {time}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Waitlist Box */}
            {selectedDate && (
              <TouchableOpacity 
                style={styles.waitlistBox}
                onPress={() => setShowWaitlistModal(true)}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A6F', '#FF6B6B']}
                  style={styles.waitlistGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.waitlistBoxTitle}>לא מצאת תור לזמן שלך? 🕐</Text>
                  <Text style={styles.waitlistBoxSubtitle}>כנס לרשימת המתנה</Text>
                  <Text style={styles.waitlistBoxHint}>נודיע לך ברגע שיתפנה תור!</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Selected Summary */}
        {currentStep > 1 && (
          <View style={styles.summaryContainer}>
            <LinearGradient
              colors={['#191919', '#090909', '#171717']}
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
              <View style={styles.summaryLogoWrap}>
                <Image
                  source={require('../../assets/images/icon.png')}
                  style={styles.summaryLogo}
                  resizeMode="contain"
                />
              </View>
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

      {/* Waitlist Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showWaitlistModal}
        onRequestClose={() => setShowWaitlistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>רשימת המתנה 📋</Text>
            
            <View style={styles.waitlistModalContent}>
              <Text style={styles.waitlistModalSubtitle}>
                ליום: {selectedDate?.toLocaleDateString('he-IL')}
              </Text>
              
              <Text style={styles.waitlistLabel}>לאיזה שעה תעדיף?</Text>
              <Text style={styles.waitlistHint}>אנא כתוב טווח שעות רצוי</Text>
              
              <View style={styles.timeRangeContainer}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>משעה:</Text>
                  <ScrollView 
                    style={styles.timePicker}
                    showsVerticalScrollIndicator={true}
                  >
                    {generateTimeSlots(8, 20).map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeOption,
                          waitlistTimeStart === time && styles.selectedTimeOption
                        ]}
                        onPress={() => setWaitlistTimeStart(time)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          waitlistTimeStart === time && styles.selectedTimeOptionText
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>עד שעה:</Text>
                  <ScrollView 
                    style={styles.timePicker}
                    showsVerticalScrollIndicator={true}
                  >
                    {generateTimeSlots(8, 20).map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeOption,
                          waitlistTimeEnd === time && styles.selectedTimeOption
                        ]}
                        onPress={() => setWaitlistTimeEnd(time)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          waitlistTimeEnd === time && styles.selectedTimeOptionText
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              
              <Text style={styles.waitlistSummary}>
                טווח שעות מבוקש: {waitlistTimeStart} - {waitlistTimeEnd}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleWaitlistSubmit}
              >
                <Text style={styles.confirmButtonText}>הירשם לרשימת המתנה</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowWaitlistModal(false)}
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
  selectionSummary: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  selectionSummaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  datesListContainer: {
    paddingHorizontal: 60, // Narrower cards as requested
    gap: 12,
  },
  dateListItem: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dateListItemGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateListItem: {
    borderWidth: 2,
    borderColor: '#3b82f6',
    transform: [{ scale: 1.02 }],
  },
  dateListItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333', // Black text for white background
  },
  dateListItemTextUnavailable: {
    color: '#FF6B6B',
  },
  selectionSummarySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 24,
    marginBottom: 32,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 40,
    gap: 12,
  },
  actionColumn: {
    flex: 1,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 12, // Shrunk from 14
    borderRadius: 20, // More modern look
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 4,
    elevation: 3,
  },
  urgentButton: {
    backgroundColor: '#C1A386', // Gold/Brown color from image
  },
  waitlistButton: {
    backgroundColor: '#000',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
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
  stepTitleBookingRtlLeft: {
    width: '100%',
    textAlign: 'left',
    writingDirection: 'rtl',
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
  barberStage: {
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ebedf0',
    shadowColor: '#121212',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },
  barbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 18,
    rowGap: 22,
  },
  barberCircleItem: {
    width: 148,
  },
  barberCirclePressable: {
    alignItems: 'center',
  },
  barberCircleFrame: {
    width: 134,
    height: 134,
    borderRadius: 67,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  barberCircleFrameSelected: {
    shadowColor: '#f5d37a',
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 12,
  },
  barberCircleInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#0f0f0f',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  barberPlaceholder: {
    fontSize: 36,
    color: '#fff',
  },
  barberCircleName: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#2a2a2a',
    textAlign: 'center',
  },
  barberCircleNameSelected: {
    color: '#8b6b2e',
  },
  barberCircleExperience: {
    marginTop: 2,
    fontSize: 12,
    color: '#7a7a7a',
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
    opacity: 0.8,
  },
  barberCirclePhoto: {
    width: '100%',
    height: '100%',
  },
  treatmentsContainer: {
    marginBottom: 16,
  },
  treatmentCard: {
    borderRadius: 26,
    marginBottom: 16,
    backgroundColor: 'rgba(12,12,12,0.94)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 20,
    elevation: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  treatmentCardSelected: {
    borderColor: '#d4a74d',
    shadowColor: '#d4a74d',
    shadowOpacity: 0.36,
    shadowRadius: 20,
    elevation: 12,
  },
  treatmentGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    backgroundColor: 'rgba(16,16,16,0.92)',
    position: 'relative',
  },
  treatmentCornerSlash: {
    position: 'absolute',
    top: -12,
    width: 82,
    height: 26,
    borderRadius: 10,
    zIndex: 3,
    opacity: 0.7,
  },
  treatmentCornerLeft: {
    left: -14,
    transform: [{ rotate: '-24deg' }],
  },
  treatmentCornerLeftSelected: {
    opacity: 0.95,
  },
  treatmentCornerRight: {
    right: -14,
    transform: [{ rotate: '24deg' }],
  },
  treatmentCornerRightSelected: {
    opacity: 1,
  },
  treatmentTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  treatmentAccent: {
    width: 8,
    backgroundColor: 'rgba(212,167,77,0.38)',
  },
  treatmentAccentSelected: {
    backgroundColor: '#d4a74d',
  },
  treatmentImage: {
    width: 86,
    height: 86,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
    alignSelf: 'flex-end',
  },
  treatmentImageSelected: {
    backgroundColor: 'rgba(212,167,77,0.24)',
    borderColor: 'rgba(212,167,77,0.7)',
  },
  treatmentPlaceholder: {
    fontSize: 34,
    color: '#e5e7eb',
  },
  treatmentPlaceholderSelected: {
    color: '#f4cf85',
  },
  treatmentTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  treatmentTagSelected: {
    backgroundColor: 'rgba(212,167,77,0.2)',
    borderColor: 'rgba(212,167,77,0.56)',
  },
  treatmentTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d1d5db',
  },
  treatmentTagTextSelected: {
    color: '#f4cf85',
  },
  treatmentInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  treatmentName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f5f5f5',
    marginBottom: 4,
    textAlign: 'right',
  },
  treatmentNameSelected: {
    color: '#f4cf85',
  },
  treatmentDescription: {
    fontSize: 13,
    color: 'rgba(229,231,235,0.82)',
    marginBottom: 12,
    lineHeight: 18,
    textAlign: 'right',
  },
  treatmentDescriptionSelected: {
    color: 'rgba(244,207,133,0.82)',
  },
  treatmentDetails: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    gap: 8,
    alignItems: 'center',
  },
  treatmentMetaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  treatmentMetaChipSelected: {
    backgroundColor: 'rgba(212,167,77,0.2)',
    borderColor: 'rgba(212,167,77,0.5)',
  },
  treatmentPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f3f4f6',
  },
  treatmentDuration: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  treatmentMetaTextSelected: {
    color: '#f4cf85',
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
  unavailableCard: {
    opacity: 0.6,
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
  unavailableLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
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
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  summaryGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f7f7f7',
    marginBottom: 16,
    textAlign: 'right',
  },
  summaryItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(229,231,235,0.76)',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f5f5f5',
  },
  summaryLogoWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLogo: {
    width: 102,
    height: 102,
    opacity: 0.76,
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
  refreshContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noSlotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  noSlotsEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  noSlotsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  noSlotsSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  noSlotsHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  waitlistBox: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  waitlistGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  waitlistBoxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  waitlistBoxSubtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  waitlistBoxHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  waitlistModalContent: {
    marginVertical: 20,
  },
  waitlistModalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  waitlistLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  waitlistHint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  timePicker: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  selectedTimeOption: {
    backgroundColor: '#007bff',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedTimeOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  waitlistSummary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
  },
});

export default BookingScreen; 
