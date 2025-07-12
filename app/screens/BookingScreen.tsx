import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CustomCard } from '../components/CustomCard';
import { NeonButton } from '../components/NeonButton';
import { colors } from '../constants/colors';
import { useBooking } from '../hooks/useBooking';

interface BookingScreenProps {
  onNavigate: (screen: string) => void;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({ onNavigate }) => {
  const { bookingData, updateBookingData } = useBooking();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, title: 'Select Barber', description: 'Choose your preferred barber' },
    { id: 2, title: 'Select Treatment', description: 'Pick your service' },
    { id: 3, title: 'Select Time', description: 'Choose your appointment time' },
    { id: 4, title: 'Confirm', description: 'Review and confirm booking' },
  ];

  const handleStepPress = (stepId: number) => {
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
      switch (stepId) {
        case 1:
          onNavigate('select-barber');
          break;
        case 2:
          onNavigate('select-treatment');
          break;
        case 3:
          onNavigate('select-time');
          break;
        case 4:
          onNavigate('confirmation');
          break;
      }
    }
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
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
            <Text style={styles.title}>Book Appointment</Text>
            <Text style={styles.subtitle}>Follow the steps to schedule your visit</Text>
          </View>

          {/* Progress Steps */}
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              return (
                <CustomCard
                  key={step.id}
                  title={step.title}
                  subtitle={step.description}
                  variant={status === 'completed' ? 'selected' : status === 'current' ? 'default' : 'disabled'}
                  onPress={() => handleStepPress(step.id)}
                  style={styles.stepCard}
                >
                  <View style={styles.stepIndicator}>
                    <Text style={styles.stepNumber}>{step.id}</Text>
                  </View>
                </CustomCard>
              );
            })}
          </View>

          {/* Current Booking Summary */}
          {Object.keys(bookingData).length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Current Selection</Text>
              <CustomCard style={styles.summaryCard}>
                {bookingData.barberName && (
                  <Text style={styles.summaryText}>Barber: {bookingData.barberName}</Text>
                )}
                {bookingData.treatmentName && (
                  <Text style={styles.summaryText}>Service: {bookingData.treatmentName}</Text>
                )}
                {bookingData.date && (
                  <Text style={styles.summaryText}>Date: {bookingData.date}</Text>
                )}
                {bookingData.time && (
                  <Text style={styles.summaryText}>Time: {bookingData.time}</Text>
                )}
              </CustomCard>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <NeonButton
              title="Continue"
              onPress={() => handleStepPress(currentStep)}
              variant="primary"
              style={styles.actionButton}
            />
            <NeonButton
              title="Reset Booking"
              onPress={() => {
                // Reset booking data
                updateBookingData({});
                setCurrentStep(1);
              }}
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
  stepsContainer: {
    marginBottom: 32,
  },
  stepCard: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumber: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  summarySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  summaryCard: {
    padding: 16,
  },
  summaryText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 8,
  },
  actionSection: {
    marginBottom: 40,
  },
  actionButton: {
    marginBottom: 12,
  },
}); 