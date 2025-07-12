import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CustomCard } from '../components/CustomCard';
import { NeonButton } from '../components/NeonButton';
import { colors } from '../constants/colors';
import { useBooking } from '../hooks/useBooking';

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface SelectTimeScreenProps {
  onNavigate: (screen: string) => void;
}

export const SelectTimeScreen: React.FC<SelectTimeScreenProps> = ({ onNavigate }) => {
  const { bookingData, updateBookingData } = useBooking();
  const [selectedDate, setSelectedDate] = useState<string>('Today');
  const [selectedTime, setSelectedTime] = useState<string | null>(bookingData.time || null);

  const dates = ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'];

  const timeSlots: TimeSlot[] = [
    { id: '1', time: '09:00 AM', available: true },
    { id: '2', time: '10:00 AM', available: true },
    { id: '3', time: '11:00 AM', available: false },
    { id: '4', time: '12:00 PM', available: true },
    { id: '5', time: '01:00 PM', available: true },
    { id: '6', time: '02:00 PM', available: false },
    { id: '7', time: '03:00 PM', available: true },
    { id: '8', time: '04:00 PM', available: true },
    { id: '9', time: '05:00 PM', available: true },
    { id: '10', time: '06:00 PM', available: false },
  ];

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    if (timeSlot.available) {
      setSelectedTime(timeSlot.time);
      updateBookingData({
        date: selectedDate,
        time: timeSlot.time,
      });
    }
  };

  const handleContinue = () => {
    if (selectedTime) {
      onNavigate('confirmation');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.primary]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Time</Text>
            <Text style={styles.subtitle}>Choose your preferred appointment time</Text>
          </View>

          {/* Date Selection */}
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {dates.map((date, index) => (
                <CustomCard
                  key={index}
                  title={date}
                  variant={selectedDate === date ? 'selected' : 'default'}
                  onPress={() => handleDateSelect(date)}
                  style={styles.dateCard}
                />
              ))}
            </ScrollView>
          </View>

          {/* Time Slots */}
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>Available Times</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((timeSlot) => (
                <CustomCard
                  key={timeSlot.id}
                  title={timeSlot.time}
                  variant={
                    !timeSlot.available
                      ? 'disabled'
                      : selectedTime === timeSlot.time
                      ? 'selected'
                      : 'default'
                  }
                  onPress={() => handleTimeSelect(timeSlot)}
                  style={styles.timeCard}
                >
                  {!timeSlot.available && (
                    <Text style={styles.unavailableText}>Booked</Text>
                  )}
                </CustomCard>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <NeonButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              disabled={!selectedTime}
              style={styles.actionButton}
            />
            <NeonButton
              title="Back"
              onPress={() => onNavigate('select-treatment')}
              variant="secondary"
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  dateSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  dateScroll: {
    flexDirection: 'row',
  },
  dateCard: {
    marginRight: 12,
    minWidth: 100,
  },
  timeSection: {
    marginBottom: 32,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeCard: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  unavailableText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  actionSection: {
    marginBottom: 40,
  },
  actionButton: {
    marginBottom: 12,
  },
}); 