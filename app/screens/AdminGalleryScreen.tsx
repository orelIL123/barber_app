import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { 
  GalleryImage, 
  getGalleryImages, 
  addGalleryImage, 
  deleteGalleryImage,
  getAllStorageImages,
  uploadImageToStorage
} from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface AdminGalleryScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminGalleryScreen: React.FC<AdminGalleryScreenProps> = ({ onNavigate, onBack }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [storageImages, setStorageImages] = useState<{
    gallery: string[];
    backgrounds: string[];
    splash: string[];
    workers: string[];
    aboutus: string[];
  }>({
    gallery: [],
    backgrounds: [],
    splash: [],
    workers: [],
    aboutus: []
  });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'gallery' | 'background' | 'splash' | 'aboutus'>('gallery');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Form states
  const [formData, setFormData] = useState({
    imageUrl: '',
    type: 'gallery' as 'gallery' | 'background' | 'splash' | 'aboutus',
    order: '0'
  });

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const [imagesData, storageImagesData] = await Promise.all([
        getGalleryImages(),
        getAllStorageImages()
      ]);
      setImages(imagesData);
      setStorageImages(storageImagesData);
    } catch (error) {
      console.error('Error loading images:', error);
      showToast('שגיאה בטעינת התמונות', 'error');
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

  const openAddModal = (type: 'gallery' | 'background' | 'splash' | 'aboutus') => {
    setFormData({
      imageUrl: '',
      type,
      order: '0'
    });
    setModalVisible(true);
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

  const uploadImageFromDevice = async () => {
    try {
      const imageUri = await pickImageFromDevice();
      if (!imageUri) return;

      showToast('מעלה תמונה...', 'success');
      
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const folderPath = formData.type === 'background' ? 'backgrounds' : formData.type;
      
      const downloadURL = await uploadImageToStorage(imageUri, folderPath, fileName);
      
      setFormData({
        ...formData,
        imageUrl: downloadURL
      });
      
      showToast('התמונה הועלתה בהצלחה', 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('שגיאה בהעלאת התמונה', 'error');
    }
  };

  const validateForm = () => {
    if (!formData.imageUrl.trim()) {
      showToast('נא להזין קישור לתמונה', 'error');
      return false;
    }
    
    // Basic URL validation
    try {
      new URL(formData.imageUrl);
    } catch {
      showToast('נא להזין קישור תקין', 'error');
      return false;
    }

    if (isNaN(Number(formData.order))) {
      showToast('נא להזין מספר סדר תקין', 'error');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // Check if single image restriction applies
      if (formData.type !== 'gallery') {
        const existingImages = images.filter(img => img.type === formData.type);
        if (existingImages.length > 0) {
          showToast(`יכולה להיות רק תמונה אחת עבור ${getTabTitle(formData.type)}`, 'error');
          return;
        }
      }

      const imageData = {
        imageUrl: formData.imageUrl.trim(),
        type: formData.type,
        order: parseInt(formData.order),
        isActive: true
      };

      const newImageId = await addGalleryImage(imageData);
      setImages(prev => [...prev, { id: newImageId, ...imageData, createdAt: new Date() as any }]);
      showToast('התמונה נוספה בהצלחה');
      setModalVisible(false);
      
      // Refresh storage images
      const storageImagesData = await getAllStorageImages();
      setStorageImages(storageImagesData);
    } catch (error) {
      console.error('Error saving image:', error);
      showToast('שגיאה בהוספת התמונה', 'error');
    }
  };

  const handleDelete = async (imageId: string) => {
    Alert.alert(
      'מחיקת תמונה',
      'האם אתה בטוח שברצונך למחוק תמונה זו?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGalleryImage(imageId);
              setImages(prev => prev.filter(img => img.id !== imageId));
              showToast('התמונה נמחקה בהצלחה');
            } catch (error) {
              console.error('Error deleting image:', error);
              showToast('שגיאה במחיקת התמונה', 'error');
            }
          }
        }
      ]
    );
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'gallery': return 'גלריה';
      case 'background': return 'רקע';
      case 'splash': return 'מסך טעינה';
      case 'aboutus': return 'אודותינו';
      default: return tab;
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'gallery': return 'images';
      case 'background': return 'image';
      case 'splash': return 'phone-portrait';
      case 'aboutus': return 'information-circle';
      default: return 'image';
    }
  };

  const filteredImages = images.filter(img => img.type === selectedTab);
  
  // Get Firebase Storage images for current tab
  const getStorageImagesForTab = () => {
    switch (selectedTab) {
      case 'gallery':
        return storageImages.gallery;
      case 'background':
        return storageImages.backgrounds;
      case 'splash':
        return storageImages.splash;
      case 'aboutus':
        return storageImages.aboutus;
      default:
        return [];
    }
  };
  
  const storageImagesForTab = getStorageImagesForTab();

  const tabs = [
    { key: 'gallery', label: 'גלריה', icon: 'images' },
    { key: 'background', label: 'רקע', icon: 'image' },
    { key: 'splash', label: 'מסך טעינה', icon: 'phone-portrait' },
    { key: 'aboutus', label: 'אודותינו', icon: 'information-circle' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ניהול הגלריה"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />
      
      <View style={styles.content}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedTab === tab.key && styles.activeTab
              ]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={selectedTab === tab.key ? '#007bff' : '#666'} 
              />
              <Text style={[
                styles.tabText,
                selectedTab === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add Image Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => openAddModal(selectedTab)}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>הוסף תמונה ל{getTabTitle(selectedTab)}</Text>
          </TouchableOpacity>
        </View>

        {/* Images Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>טוען תמונות...</Text>
          </View>
        ) : (
          <ScrollView style={styles.imagesList}>
            {/* Firebase Storage Images Section */}
            {storageImagesForTab.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>תמונות מ-Firebase Storage</Text>
                <View style={styles.imagesGrid}>
                  {storageImagesForTab.map((imageUrl, index) => (
                    <View key={`storage-${index}`} style={styles.imageCard}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.imagePreview}
                        defaultSource={{ uri: 'https://via.placeholder.com/200x150' }}
                      />
                      <View style={styles.imageInfo}>
                        <Text style={styles.imageOrder}>Firebase Storage</Text>
                        <Text style={styles.imageStatus}>פעיל</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Firestore Images Section */}
            {filteredImages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>תמונות מ-Firestore</Text>
                <View style={styles.imagesGrid}>
                  {filteredImages.map((image) => (
                    <View key={image.id} style={styles.imageCard}>
                      <Image
                        source={{ uri: image.imageUrl }}
                        style={styles.imagePreview}
                        defaultSource={{ uri: 'https://via.placeholder.com/200x150' }}
                      />
                      <View style={styles.imageOverlay}>
                        <TouchableOpacity
                          style={styles.deleteImageButton}
                          onPress={() => handleDelete(image.id)}
                        >
                          <Ionicons name="trash" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.imageInfo}>
                        <Text style={styles.imageOrder}>סדר: {image.order}</Text>
                        <Text style={styles.imageStatus}>
                          {image.isActive ? 'פעיל' : 'לא פעיל'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Empty State */}
            {filteredImages.length === 0 && storageImagesForTab.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name={getTabIcon(selectedTab) as any} size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>אין תמונות ב{getTabTitle(selectedTab)}</Text>
                <TouchableOpacity 
                  style={styles.emptyAddButton} 
                  onPress={() => openAddModal(selectedTab)}
                >
                  <Text style={styles.emptyAddButtonText}>הוסף תמונה ראשונה</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Add Image Modal */}
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
                הוספת תמונה ל{getTabTitle(formData.type)}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>תמונה</Text>
                
                {/* Upload from device button */}
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={uploadImageFromDevice}
                >
                  <Ionicons name="cloud-upload" size={20} color="#007bff" />
                  <Text style={styles.uploadButtonText}>העלה תמונה מהמכשיר</Text>
                </TouchableOpacity>
                
                <Text style={styles.orText}>או</Text>
                
                {/* URL input */}
                <TextInput
                  style={styles.textInput}
                  value={formData.imageUrl}
                  onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
                  placeholder="https://example.com/image.jpg"
                  textAlign="right"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>סדר תצוגה</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.order}
                  onChangeText={(text) => setFormData({ ...formData, order: text })}
                  placeholder="0"
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Text style={styles.inputHint}>
                  תמונות עם מספר נמוך יותר יופיעו קודם
                </Text>
              </View>

              {/* Image Preview */}
              {formData.imageUrl && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>תצוגה מקדימה</Text>
                  <Image
                    source={{ uri: formData.imageUrl }}
                    style={styles.previewImage}
                    defaultSource={{ uri: 'https://via.placeholder.com/200x150' }}
                  />
                </View>
              )}

              <View style={styles.guidelinesContainer}>
                <Text style={styles.guidelinesTitle}>הנחיות לתמונות:</Text>
                <Text style={styles.guideline}>• יחס גובה-רוחב מומלץ: 4:3</Text>
                <Text style={styles.guideline}>• רזולוציה מינימלית: 800x600</Text>
                <Text style={styles.guideline}>• פורמטים נתמכים: JPG, PNG</Text>
                <Text style={styles.guideline}>• גודל קובץ מקסימלי: 5MB</Text>
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
                <Text style={styles.saveButtonText}>הוסף תמונה</Text>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: 'bold',
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
  imagesList: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'right',
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
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  deleteImageButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    borderRadius: 20,
    padding: 8,
  },
  imageInfo: {
    padding: 12,
  },
  imageOrder: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  imageStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
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
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  guidelinesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  guideline: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginVertical: 8,
  },
});

export default AdminGalleryScreen;