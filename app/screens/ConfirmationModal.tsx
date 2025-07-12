import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CustomCard } from '../components/CustomCard';
import { NeonButton } from '../components/NeonButton';
import { ToastSuccess } from '../components/ToastSuccess';
import { colors } from '../constants/colors';
import { useBooking } from '../hooks/useBooking';

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  onClose,
  onNavigate,
}) => {
  const { bookingData, createBooking, loading } = useBooking();
  const [showToast, setShowToast] = useState(false);

  const handleConfirmBooking = async () => {
    try {
      if (bookingData.barberId && bookingData.treatmentId && bookingData.date && bookingData.time) {
        const finalBookingData = {
          barberId: bookingData.barberId,
          barberName: bookingData.barberName || '',
          treatmentId: bookingData.treatmentId,
          treatmentName: bookingData.treatmentName || '',
          date: bookingData.date,
          time: bookingData.time,
          userId: 'user123', // Replace with actual user ID
          userName: 'John Doe', // Replace with actual user name
          status: 'pending' as const,
        };

        await createBooking(finalBookingData);
        setShowToast(true);
        
        // Close modal after successful booking
        setTimeout(() => {
          onClose();
          onNavigate('home');
        }, 2000);
      }
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.background, colors.primary]}
          style={styles.gradient}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Confirm Booking</Text>
              <Text style={styles.subtitle}>Review your appointment details</Text>
            </View>

            {/* Booking Summary */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Appointment Details</Text>
              <CustomCard style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Barber:</Text>
                  <Text style={styles.summaryValue}>{bookingData.barberName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service:</Text>
                  <Text style={styles.summaryValue}>{bookingData.treatmentName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Date:</Text>
                  <Text style={styles.summaryValue}>{bookingData.date}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Time:</Text>
                  <Text style={styles.summaryValue}>{bookingData.time}</Text>
                </View>
              </CustomCard>
            </View>

            {/* Important Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Important Notes</Text>
              <CustomCard style={styles.notesCard}>
                <Text style={styles.noteText}>• Please arrive 5 minutes before your appointment</Text>
                <Text style={styles.noteText}>• Bring a photo ID for verification</Text>
                <Text style={styles.noteText}>• Cancellations must be made 24 hours in advance</Text>
                <Text style={styles.noteText}>• Late arrivals may result in appointment cancellation</Text>
              </CustomCard>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              <NeonButton
                title={loading ? "Confirming..." : "Confirm Booking"}
                onPress={handleConfirmBooking}
                variant="success"
                disabled={loading}
                style={styles.confirmButton}
              />
              <NeonButton
                title="Cancel"
                onPress={handleCancel}
                variant="secondary"
                style={styles.cancelButton}
              />
            </View>
          </ScrollView>

          {/* Success Toast */}
          <ToastSuccess
            message="Booking confirmed successfully! 🎉"
            visible={showToast}
            onHide={() => setShowToast(false)}
          />
        </LinearGradient>
      </SafeAreaView>
    </Modal>
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
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  notesSection: {
    marginBottom: 32,
  },
  notesCard: {
    padding: 20,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  actionSection: {
    marginBottom: 40,
  },
  confirmButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 12,
  },
}); 