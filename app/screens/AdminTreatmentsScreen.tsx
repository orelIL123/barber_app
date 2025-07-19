import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Treatment,
    addTreatment,
    deleteTreatment,
    getTreatments,
    updateTreatment,
    uploadImageToStorage
} from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface AdminTreatmentsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminTreatmentsScreen: React.FC<AdminTreatmentsScreenProps> = ({ onNavigate, onBack }) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    price: '',
    description: '',
    image: ''
  });

  useEffect(() => {
    loadTreatments();
  }, []);

  const loadTreatments = async () => {
    try {
      setLoading(true);
      const treatmentsData = await getTreatments();
      setTreatments(treatmentsData);
    } catch (error) {
      console.error('Error loading treatments:', error);
      showToast('שגיאה בטעינת הטיפולים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const pickImageFromDevice = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showToast('נדרשת הרשאה לגישה לגלריה', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('שגיאה בבחירת התמונה', 'error');
    }
    return null;
  };

  const uploadTreatmentImage = async () => {
    try {
      console.log('📱 Starting treatment image upload...');
      const imageUri = await pickImageFromDevice();
      if (!imageUri) {
        console.log('❌ No image selected');
        return;
      }

      console.log('📤 Uploading treatment image:', imageUri);
      showToast('מעלה תמונה...', 'success');
      
      const fileName = `treatment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const folderPath = 'treatments';
      
      console.log('📁 Upload path:', `${folderPath}/${fileName}`);
      const downloadURL = await uploadImageToStorage(imageUri, folderPath, fileName);
      console.log('✅ Upload successful. Download URL:', downloadURL);
      
      setFormData({
        ...formData,
        image: downloadURL
      });
      
      showToast('התמונה הועלתה בהצלחה', 'success');
    } catch (error) {
      console.error('❌ Error uploading treatment image:', error);
      showToast('שגיאה בהעלאת התמונה', 'error');
    }
  };

  const openAddModal = () => {
    console.log('🔧 Opening add treatment modal...');
    setEditingTreatment(null);
    const initialFormData = {
      name: '',
      duration: '',
      price: '',
      description: '',
      image: ''
    };
    console.log('📝 Initial form data:', initialFormData);
    setFormData(initialFormData);
    setModalVisible(true);
    console.log('✅ Modal should be visible now');
  };

  const openEditModal = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      name: treatment.name,
      duration: treatment.duration.toString(),
      price: treatment.price.toString(),
      description: treatment.description,
      image: treatment.image
    });
    setModalVisible(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast('נא למלא שם טיפול', 'error');
      return false;
    }
    if (!formData.duration.trim() || isNaN(Number(formData.duration))) {
      showToast('נא למלא זמן טיפול תקין', 'error');
      return false;
    }
    if (!formData.price.trim() || isNaN(Number(formData.price))) {
      showToast('נא למלא מחיר תקין', 'error');
      return false;
    }
    if (!formData.description.trim()) {
      showToast('נא למלא תיאור טיפול', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const treatmentData = {
        name: formData.name.trim(),
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        description: formData.description.trim(),
        image: formData.image.trim() || 'https://via.placeholder.com/200x150'
      };

      if (editingTreatment) {
        await updateTreatment(editingTreatment.id, treatmentData);
        setTreatments(prev => 
          prev.map(t => 
            t.id === editingTreatment.id ? { ...t, ...treatmentData } : t
          )
        );
        showToast('הטיפול עודכן בהצלחה');
      } else {
        const newTreatmentId = await addTreatment(treatmentData);
        setTreatments(prev => [...prev, { id: newTreatmentId, ...treatmentData }]);
        showToast('הטיפול נוסף בהצלחה');
      }

      setModalVisible(false);
    } catch (error) {
      console.error('Error saving treatment:', error);
      showToast('שגיאה בשמירת הטיפול', 'error');
    }
  };

  const handleDelete = async (treatmentId: string, treatmentName: string) => {
    Alert.alert(
      'מחיקת טיפול',
      `האם אתה בטוח שברצונך למחוק את הטיפול "${treatmentName}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTreatment(treatmentId);
              setTreatments(prev => prev.filter(t => t.id !== treatmentId));
              showToast('הטיפול נמחק בהצלחה');
            } catch (error) {
              console.error('Error deleting treatment:', error);
              showToast('שגיאה במחיקת הטיפול', 'error');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ניהול טיפולים"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />
      
      <View style={styles.content}>
        {/* Add Treatment Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>הוסף טיפול חדש</Text>
          </TouchableOpacity>
        </View>

        {/* Treatments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>טוען טיפולים...</Text>
          </View>
        ) : (
          <ScrollView style={styles.treatmentsList}>
            {treatments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cut-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>אין טיפולים במערכת</Text>
                <TouchableOpacity style={styles.emptyAddButton} onPress={openAddModal}>
                  <Text style={styles.emptyAddButtonText}>הוסף טיפול ראשון</Text>
                </TouchableOpacity>
              </View>
            ) : (
              treatments.map((treatment) => (
                <View key={treatment.id} style={styles.treatmentCard}>
                  <View style={styles.treatmentHeader}>
                    <Text style={styles.treatmentName}>{treatment.name}</Text>
                    <View style={styles.treatmentActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(treatment)}
                      >
                        <Ionicons name="create" size={20} color="#007bff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(treatment.id, treatment.name)}
                      >
                        <Ionicons name="trash" size={20} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {treatment.image && (
                    <View style={styles.treatmentImageContainer}>
                      <Image
                        source={{ uri: treatment.image }}
                        style={styles.treatmentImage}
                        defaultSource={{ uri: 'https://via.placeholder.com/200x150' }}
                      />
                    </View>
                  )}
                  
                  <Text style={styles.treatmentDescription}>
                    {treatment.description}
                  </Text>
                  
                  <View style={styles.treatmentDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.detailText}>{treatment.duration} דקות</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="cash" size={16} color="#666" />
                      <Text style={styles.detailText}>₪{treatment.price}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                      <Text style={styles.detailText}>זמין</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Add/Edit Treatment Modal */}
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
                {editingTreatment ? 'עריכת טיפול' : 'הוספת טיפול חדש'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Debug info */}
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>Modal is open: {modalVisible ? 'Yes' : 'No'}</Text>
                <Text style={styles.debugText}>Form data: {JSON.stringify(formData)}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם הטיפול</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => {
                    console.log('📝 Updating name:', text);
                    setFormData({ ...formData, name: text });
                  }}
                  placeholder="לדוגמה: תספורת קלאסית"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>זמן הטיפול (דקות)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.duration}
                  onChangeText={(text) => setFormData({ ...formData, duration: text })}
                  placeholder="30"
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מחיר (₪)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  placeholder="80"
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>תיאור הטיפול</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="תיאור מפורט של הטיפול"
                  multiline
                  numberOfLines={4}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>תמונה לטיפול</Text>
                {formData.image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: formData.image }}
                      style={styles.imagePreview}
                      defaultSource={{ uri: 'https://via.placeholder.com/200x150' }}
                    />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={uploadTreatmentImage}
                    >
                      <Ionicons name="camera" size={20} color="#007bff" />
                      <Text style={styles.changeImageText}>שנה תמונה</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadImageButton}
                    onPress={uploadTreatmentImage}
                  >
                    <Ionicons name="camera" size={24} color="#007bff" />
                    <Text style={styles.uploadImageText}>העלה תמונה מהטלפון</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>קישור לתמונה (אופציונלי)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.image}
                  onChangeText={(text) => setFormData({ ...formData, image: text })}
                  placeholder="https://example.com/image.jpg"
                  textAlign="right"
                />
                <Text style={styles.inputHint}>או השתמש בקישור ישיר לתמונה</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>שמור</Text>
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  treatmentsList: {
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
  treatmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  treatmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'right',
  },
  treatmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  treatmentImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  treatmentImage: {
    width: '100%',
    height: '100%',
  },
  treatmentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
    textAlign: 'right',
  },
  treatmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  modalBody: {
    flex: 1,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  imagePreviewContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeImageText: {
    fontSize: 12,
    color: '#007bff',
  },
  uploadImageButton: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadImageText: {
    fontSize: 14,
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  debugInfo: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#333',
  },
});

export default AdminTreatmentsScreen;