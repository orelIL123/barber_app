import React from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TopNav from '../components/TopNav';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function TeamScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleClose = () => {
    router.replace('/');
  };

  const handleBookWithBarber = (barberId: string) => {
    router.push({
      pathname: '/booking',
      params: { barberId }
    });
  };

  const teamMembers = [
    {
      id: '1',
      name: 'אבי כהן',
      role: 'ספר בכיר',
      experience: '10+ שנות ניסיון',
      specialties: ['תספורות קלאסיות', 'זקן וספון', 'עיצוב שיער'],
      rating: 4.9,
      available: true,
      image: 'https://via.placeholder.com/80x80/333333/ffffff?text=אבי'
    },
    {
      id: '2',
      name: 'דוד לוי',
      role: 'ספר מקצועי',
      experience: '8+ שנות ניסיון',
      specialties: ['תספורות מודרניות', 'פיידים', 'עיצוב זקן'],
      rating: 4.8,
      available: true,
      image: 'https://via.placeholder.com/80x80/333333/ffffff?text=דוד'
    },
    {
      id: '3',
      name: 'מיכאל רוזן',
      role: 'ספר מתמחה',
      experience: '5+ שנות ניסיון',
      specialties: ['תספורות ילדים', 'עיצוב שיער', 'צביעות'],
      rating: 4.7,
      available: false,
      image: 'https://via.placeholder.com/80x80/333333/ffffff?text=מיכאל'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="הצוות שלנו" 
        onBellPress={() => {}} 
        onMenuPress={() => {}} 
        showBackButton={true}
        onBackPress={handleBack}
        showCloseButton={true}
        onClosePress={handleClose}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>הצוות שלנו</Text>
            <Text style={styles.subtitle}>הכר את הספרים המקצועיים שלנו</Text>
          </View>
          
          {/* Team Members */}
          <View style={styles.teamSection}>
            {teamMembers.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <LinearGradient
                  colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                />
                
                <View style={styles.memberHeader}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.photoContainer}>
                      <Image 
                        source={{ uri: member.image }} 
                        style={styles.memberPhoto}
                        defaultSource={{ uri: 'https://via.placeholder.com/80x80/333333/ffffff?text=?' }}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.photoGradient}
                      />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                      <Text style={styles.memberExperience}>{member.experience}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.statusContainer}>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.rating}>{member.rating}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: member.available ? '#4CAF50' : '#f44336' }]}>
                      <Text style={styles.statusText}>
                        {member.available ? 'זמין' : 'לא זמין'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.specialtiesContainer}>
                  <Text style={styles.specialtiesTitle}>התמחויות:</Text>
                  <View style={styles.specialtiesGrid}>
                    {member.specialties.map((specialty, index) => (
                      <View key={index} style={styles.specialtyTag}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[styles.bookButton, { opacity: member.available ? 1 : 0.5 }]}
                  onPress={() => handleBookWithBarber(member.id)}
                  disabled={!member.available}
                >
                  <LinearGradient
                    colors={['#333333', '#1a1a1a', '#000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  />
                  <Ionicons name="calendar" size={20} color="#fff" />
                  <Text style={styles.bookButtonText}>קבע תור</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          
          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>למה לבחור בנו?</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Ionicons name="cut" size={24} color="#007bff" />
                <Text style={styles.infoText}>ספרים מקצועיים עם ניסיון רב</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="time" size={24} color="#007bff" />
                <Text style={styles.infoText}>זמינות גבוהה וזמני תור גמישים</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="medal" size={24} color="#007bff" />
                <Text style={styles.infoText}>ציוד מתקדם ומוצרים איכותיים</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    paddingTop: 90,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  teamSection: {
    marginBottom: 32,
  },
  memberCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  memberPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'right',
  },
  memberRole: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
    textAlign: 'right',
  },
  memberExperience: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'right',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  specialtiesContainer: {
    marginBottom: 16,
  },
  specialtiesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'right',
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  specialtyText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoGrid: {
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
}); 