import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CustomCard } from '../components/CustomCard';
import { NeonButton } from '../components/NeonButton';
import { colors } from '../constants/colors';
import { useBooking } from '../hooks/useBooking';

interface Treatment {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  icon: string;
}

interface SelectTreatmentScreenProps {
  onNavigate: (screen: string) => void;
}

export const SelectTreatmentScreen: React.FC<SelectTreatmentScreenProps> = ({ onNavigate }) => {
  const { bookingData, updateBookingData } = useBooking();
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(bookingData.treatmentId || null);

  const treatments: Treatment[] = [
    {
      id: '1',
      name: 'Classic Haircut',
      description: 'Traditional cut with wash and style',
      duration: '30 min',
      price: '$25',
      icon: '💇‍♂️',
    },
    {
      id: '2',
      name: 'Modern Fade',
      description: 'Contemporary fade with precision',
      duration: '45 min',
      price: '$30',
      icon: '✂️',
    },
    {
      id: '3',
      name: 'Beard Trim & Shape',
      description: 'Professional beard grooming',
      duration: '20 min',
      price: '$15',
      icon: '🧔',
    },
    {
      id: '4',
      name: 'Haircut + Beard',
      description: 'Complete grooming package',
      duration: '50 min',
      price: '$35',
      icon: '👨‍💼',
    },
    {
      id: '5',
      name: 'Kids Haircut',
      description: 'Specialized cuts for children',
      duration: '25 min',
      price: '$20',
      icon: '👶',
    },
    {
      id: '6',
      name: 'Senior Haircut',
      description: 'Gentle cuts for seniors',
      duration: '35 min',
      price: '$22',
      icon: '👴',
    },
  ];

  const handleTreatmentSelect = (treatment: Treatment) => {
    setSelectedTreatment(treatment.id);
    updateBookingData({
      treatmentId: treatment.id,
      treatmentName: treatment.name,
    });
  };

  const handleContinue = () => {
    if (selectedTreatment) {
      onNavigate('select-time');
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
            <Text style={styles.title}>Select Treatment</Text>
            <Text style={styles.subtitle}>Choose your preferred service</Text>
          </View>

          {/* Treatment List */}
          <View style={styles.treatmentsContainer}>
            {treatments.map((treatment) => (
              <CustomCard
                key={treatment.id}
                title={treatment.name}
                subtitle={`${treatment.duration} • ${treatment.price}`}
                variant={selectedTreatment === treatment.id ? 'selected' : 'default'}
                onPress={() => handleTreatmentSelect(treatment)}
                style={styles.treatmentCard}
              >
                <View style={styles.treatmentInfo}>
                  <Text style={styles.icon}>{treatment.icon}</Text>
                  <View style={styles.treatmentDetails}>
                    <Text style={styles.description}>{treatment.description}</Text>
                    <View style={styles.treatmentMeta}>
                      <Text style={styles.duration}>⏱️ {treatment.duration}</Text>
                      <Text style={styles.price}>💰 {treatment.price}</Text>
                    </View>
                  </View>
                </View>
              </CustomCard>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <NeonButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              disabled={!selectedTreatment}
              style={styles.actionButton}
            />
            <NeonButton
              title="Back"
              onPress={() => onNavigate('select-barber')}
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
  treatmentsContainer: {
    marginBottom: 32,
  },
  treatmentCard: {
    marginBottom: 16,
  },
  treatmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  icon: {
    fontSize: 40,
    marginRight: 16,
  },
  treatmentDetails: {
    flex: 1,
  },
  description: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  treatmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  duration: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  price: {
    color: colors.neonGreen,
    fontSize: 12,
    fontWeight: '600',
  },
  actionSection: {
    marginBottom: 40,
  },
  actionButton: {
    marginBottom: 12,
  },
}); 