import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CustomCard } from '../components/CustomCard';
import { NeonButton } from '../components/NeonButton';
import { colors } from '../constants/colors';
import { useBooking } from '../hooks/useBooking';

interface Barber {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  avatar: string;
}

interface SelectBarberScreenProps {
  onNavigate: (screen: string) => void;
}

export const SelectBarberScreen: React.FC<SelectBarberScreenProps> = ({ onNavigate }) => {
  const { bookingData, updateBookingData } = useBooking();
  const [selectedBarber, setSelectedBarber] = useState<string | null>(bookingData.barberId || null);

  const barbers: Barber[] = [
    {
      id: '1',
      name: 'Mike Johnson',
      specialty: 'Modern Cuts & Fades',
      experience: '8 years',
      rating: 4.9,
      avatar: '👨‍💼',
    },
    {
      id: '2',
      name: 'David Chen',
      specialty: 'Classic Styles & Beards',
      experience: '12 years',
      rating: 4.8,
      avatar: '🧔‍♂️',
    },
    {
      id: '3',
      name: 'Alex Rodriguez',
      specialty: 'Trendy & Creative Cuts',
      experience: '6 years',
      rating: 4.7,
      avatar: '💇‍♂️',
    },
    {
      id: '4',
      name: 'Sam Wilson',
      specialty: 'Kids & Family Cuts',
      experience: '10 years',
      rating: 4.9,
      avatar: '👨‍🦱',
    },
  ];

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber.id);
    updateBookingData({
      barberId: barber.id,
      barberName: barber.name,
    });
  };

  const handleContinue = () => {
    if (selectedBarber) {
      onNavigate('select-treatment');
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
            <Text style={styles.title}>Select Your Barber</Text>
            <Text style={styles.subtitle}>Choose from our professional team</Text>
          </View>

          {/* Barber List */}
          <View style={styles.barbersContainer}>
            {barbers.map((barber) => (
              <CustomCard
                key={barber.id}
                title={barber.name}
                subtitle={`${barber.specialty} • ${barber.experience} • ⭐ ${barber.rating}`}
                variant={selectedBarber === barber.id ? 'selected' : 'default'}
                onPress={() => handleBarberSelect(barber)}
                style={styles.barberCard}
              >
                <View style={styles.barberInfo}>
                  <Text style={styles.avatar}>{barber.avatar}</Text>
                  <View style={styles.barberDetails}>
                    <Text style={styles.specialty}>{barber.specialty}</Text>
                    <Text style={styles.experience}>{barber.experience} experience</Text>
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
              disabled={!selectedBarber}
              style={styles.actionButton}
            />
            <NeonButton
              title="Back"
              onPress={() => onNavigate('booking')}
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
  barbersContainer: {
    marginBottom: 32,
  },
  barberCard: {
    marginBottom: 16,
  },
  barberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  avatar: {
    fontSize: 48,
    marginRight: 16,
  },
  barberDetails: {
    flex: 1,
  },
  specialty: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  experience: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  actionSection: {
    marginBottom: 40,
  },
  actionButton: {
    marginBottom: 12,
  },
}); 