import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { addShopItem, deleteShopItem, getActiveShopItems, getAllStorageImages, ShopItem, updateShopItem, uploadImageToStorage } from '../../services/firebase';
import { ScissorsLoader } from '../components/ScissorsLoader';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface ShopScreenProps {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
  isAdmin?: boolean;
}

const ShopScreen: React.FC<ShopScreenProps> = ({ onNavigate, onBack, isAdmin = false }) => {
  
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Admin add/edit product states
  const [addProductModal, setAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopItem | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    stock: ''
  });

  useEffect(() => {
    loadShopItems();
  }, []);

  const loadShopItems = async () => {
    try {
      setLoading(true);
      const items = await getActiveShopItems();
      setShopItems(items);
    } catch (error) {
      console.error('Error loading shop items:', error);
    } finally {
      setLoading(false);
    }
  };

  const openItemModal = (item: ShopItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const getCategories = () => {
    const categories = ['all', ...new Set(shopItems.map(item => item.category))];
    return categories.filter(cat => cat && cat.trim());
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'all') {
      return shopItems;
    }
    return shopItems.filter(item => item.category === selectedCategory);
  };

  const handleOrderItem = () => {
    if (selectedItem) {
      const message = `שלום רון! 👋\n\nאני מעוניין/ת לרכוש את המוצר הבא:\n📦 ${selectedItem.name}\n💰 מחיר: ${selectedItem.price}₪\n\n${selectedItem.description ? `📝 תיאור: ${selectedItem.description}\n\n` : ''}אשמח לפרטים נוספים.\nתודה!`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/972542280222?text=${encodedMessage}`;
      
      Linking.openURL(whatsappUrl).catch(() => {
        Alert.alert('שגיאה', 'לא ניתן לפתוח את WhatsApp');
      });
    }
    closeModal();
  };

  // Admin functions
  // Simple image picker - copied from working gallery function
  const pickImageFromDevice = async () => {
    try {
      console.log('📱 Requesting media library permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('שגיאה', 'נדרשת הרשאה לגישה לגלריה');
        return null;
      }

      console.log('📱 Permissions granted, launching image picker...');
      
      // Simple configuration - same as working gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5, // Reduced quality to save space
      });

      console.log('📱 Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('✅ Selected image URI:', imageUri);
        return imageUri;
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('שגיאה', `שגיאה בבחירת התמונה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
    return null;
  };

  // Simple upload function - copied from working gallery
  const uploadProductImage = async () => {
    try {
      console.log('🔄 Starting shop image upload...');
      
      const imageUri = await pickImageFromDevice();
      if (!imageUri) {
        console.log('❌ No image selected');
        return;
      }

      console.log('📱 Image selected:', imageUri);
      Alert.alert('מעלה תמונה...', 'אנא המתן');
      
      const fileName = `shop_${Date.now()}.jpg`;
      console.log('📁 Uploading to shop folder with filename:', fileName);
      
      const downloadURL = await uploadImageToStorage(imageUri, 'shop', fileName);
      console.log('✅ Upload successful, URL:', downloadURL);
      
      setProductForm(prev => ({ ...prev, imageUrl: downloadURL }));
      Alert.alert('הצלחה', 'התמונה הועלתה בהצלחה');
    } catch (error) {
      console.error('❌ Error uploading shop image:', error);
      Alert.alert('שגיאה', `שגיאה בהעלאת התמונה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
  };

  const addNewProduct = async () => {
    if (!productForm.name.trim() || !productForm.price.trim() || !productForm.imageUrl) {
      Alert.alert('שגיאה', 'נא למלא לפחות שם, מחיר ותמונה');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        await updateShopItem(editingProduct.id, {
          name: productForm.name.trim(),
          description: productForm.description.trim(),
          price: Number(productForm.price),
          category: productForm.category.trim() || 'כללי',
          imageUrl: productForm.imageUrl,
          stock: productForm.stock ? Number(productForm.stock) : undefined,
          isActive: true
        });
        Alert.alert('הצלחה', 'המוצר עודכן בהצלחה');
      } else {
        // Add new product
        await addShopItem({
          name: productForm.name.trim(),
          description: productForm.description.trim(),
          price: Number(productForm.price),
          category: productForm.category.trim() || 'כללי',
          imageUrl: productForm.imageUrl,
          stock: productForm.stock ? Number(productForm.stock) : undefined,
          isActive: true
        });
        Alert.alert('הצלחה', 'המוצר נוסף בהצלחה');
      }

      // Reset form
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: '',
        imageUrl: '',
        stock: ''
      });
      
      setEditingProduct(null);
      setAddProductModal(false);
      loadShopItems(); // Refresh items list
    } catch {
      Alert.alert('שגיאה', editingProduct ? 'שגיאה בעדכון המוצר' : 'שגיאה בהוספת המוצר');
    }
  };

  const editProduct = (product: ShopItem) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
      imageUrl: product.imageUrl,
      stock: product.stock?.toString() || ''
    });
    setAddProductModal(true);
  };

  const deleteProduct = async (productId: string) => {
    Alert.alert(
      'מחיקת מוצר',
      'האם אתה בטוח שברצונך למחוק מוצר זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShopItem(productId);
              loadShopItems(); // Refresh items list
              Alert.alert('הצלחה', 'המוצר נמחק בהצלחה');
            } catch {
              Alert.alert('שגיאה', 'שגיאה במחיקת המוצר');
            }
          }
        }
      ]
    );
  };

  const importFromStorage = async () => {
    try {
      setLoading(true);
      Alert.alert('מייבא מוצרים', 'טוען תמונות מ-Firebase Storage...');
      
      const storageImages = await getAllStorageImages();
      const shopImages = storageImages.shop || [];
      
      if (shopImages.length === 0) {
        Alert.alert('אין תמונות', 'לא נמצאו תמונות בתיקיית shop ב-Storage');
        return;
      }

      let importedCount = 0;
      for (let i = 0; i < shopImages.length; i++) {
        const imageUrl = shopImages[i];
        
        // בדוק אם המוצר כבר קיים (לפי URL של התמונה)
        const existingItems = await getActiveShopItems();
        const alreadyExists = existingItems.some(item => item.imageUrl === imageUrl);
        
        if (!alreadyExists) {
          await addShopItem({
            name: `מוצר מ-Storage ${i + 1}`,
            description: 'מוצר איכותי למספרה שהועלה מ-Storage',
            price: 50 + (i * 10),
            category: 'מוצרי טיפוח',
            imageUrl: imageUrl,
            stock: 10,
            isActive: true
          });
          importedCount++;
        }
      }
      
      loadShopItems(); // Refresh items list
      Alert.alert('הושלם!', `יובאו ${importedCount} מוצרים חדשים מ-Storage`);
    } catch (error) {
      console.error('Error importing from storage:', error);
      Alert.alert('שגיאה', 'שגיאה בייבוא מוצרים מ-Storage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="חנות המספרה"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => {
          if (onNavigate) {
            onNavigate('home');
          } else {
            console.log('No navigation function provided');
          }
        })}
      />
      
      {/* Admin Controls */}
      {isAdmin && (
        <View style={styles.adminControls}>
          <View style={styles.adminButtonsRow}>
            <TouchableOpacity 
              style={[styles.addProductButton, { flex: 1, marginRight: 8 }]}
              onPress={() => {
                setEditingProduct(null);
                setProductForm({
                  name: '',
                  description: '',
                  price: '',
                  category: '',
                  imageUrl: '',
                  stock: ''
                });
                setAddProductModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={[styles.adminButtonText, { marginLeft: 8 }]}>הוסף מוצר</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.importButton, { flex: 1, marginLeft: 8 }]}
              onPress={importFromStorage}
            >
              <Ionicons name="cloud-download" size={20} color="#fff" />
              <Text style={[styles.adminButtonText, { marginLeft: 8 }]}>ייבא מ-Storage</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={[styles.content, isAdmin && { paddingTop: 170 }]}>
        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesContainer}
        >
          {getCategories().map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.activeCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.activeCategoryText
              ]}>
                {category === 'all' ? 'הכל' : category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ScissorsLoader size={60} color="#007bff" accessibilityLabel="טוען מוצרים" />
          </View>
        ) : (
          <ScrollView style={styles.itemsContainer}>
            {getFilteredItems().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bag-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>אין מוצרים זמינים</Text>
              </View>
            ) : (
              <View style={styles.itemsGrid}>
                {getFilteredItems().map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <TouchableOpacity
                      style={styles.itemCardContent}
                      onPress={() => openItemModal(item)}
                    >
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemCategory}>{item.category}</Text>
                        <Text style={styles.itemPrice}>{item.price} ₪</Text>
                        {item.stock && item.stock <= 5 && (
                          <Text style={styles.lowStockText}>נותרו {item.stock} יחידות</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    {/* Admin buttons */}
                    {isAdmin && (
                      <View style={styles.adminProductButtons}>
                        <TouchableOpacity
                          style={styles.editProductButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            editProduct(item);
                          }}
                        >
                          <Ionicons name="create-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.deleteProductButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            deleteProduct(item.id);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Item Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                  <TouchableOpacity onPress={closeModal}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <Image source={{ uri: selectedItem.imageUrl }} style={styles.modalImage} />
                  
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalPrice}>{selectedItem.price} ₪</Text>
                    <Text style={styles.modalCategory}>קטגוריה: {selectedItem.category}</Text>
                    
                    {selectedItem.description && (
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionTitle}>תיאור:</Text>
                        <Text style={styles.descriptionText}>{selectedItem.description}</Text>
                      </View>
                    )}
                    
                    {selectedItem.stock && (
                      <Text style={styles.stockText}>
                        זמין במלאי: {selectedItem.stock} יחידות
                      </Text>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={handleOrderItem}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                    <Text style={[styles.orderButtonText, { marginLeft: 8 }]}>הזמן עכשיו</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addProductModal}
        onRequestClose={() => setAddProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'עריכת מוצר' : 'הוספת מוצר חדש'}
              </Text>
              <TouchableOpacity onPress={() => {
                setAddProductModal(false);
                setEditingProduct(null);
                setProductForm({
                  name: '',
                  description: '',
                  price: '',
                  category: '',
                  imageUrl: '',
                  stock: ''
                });
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם המוצר *</Text>
                <TextInput
                  style={styles.textInput}
                  value={productForm.name}
                  onChangeText={(text) => setProductForm(prev => ({ ...prev, name: text }))}
                  placeholder="שם המוצר"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>תיאור</Text>
                <TextInput
                  style={[styles.textInput, { height: 80 }]}
                  value={productForm.description}
                  onChangeText={(text) => setProductForm(prev => ({ ...prev, description: text }))}
                  placeholder="תיאור המוצר"
                  multiline
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>קטגוריה</Text>
                <TextInput
                  style={styles.textInput}
                  value={productForm.category}
                  onChangeText={(text) => setProductForm(prev => ({ ...prev, category: text }))}
                  placeholder="קטגוריה (למשל: שמפו, מוצרי טיפוח)"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מחיר *</Text>
                <TextInput
                  style={styles.textInput}
                  value={productForm.price}
                  onChangeText={(text) => setProductForm(prev => ({ ...prev, price: text }))}
                  placeholder="מחיר בשקלים"
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מלאי (אופציונלי)</Text>
                <TextInput
                  style={styles.textInput}
                  value={productForm.stock}
                  onChangeText={(text) => setProductForm(prev => ({ ...prev, stock: text }))}
                  placeholder="כמות במלאי"
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>תמונה *</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={uploadProductImage}
                >
                  <Ionicons name="camera" size={20} color="#007bff" />
                  <Text style={[styles.uploadButtonText, { color: '#007bff', marginLeft: 8 }]}>
                    {productForm.imageUrl ? 'החלף תמונה' : 'העלה תמונה'}
                  </Text>
                </TouchableOpacity>

                {productForm.imageUrl && (
                  <Image 
                    source={{ uri: productForm.imageUrl }} 
                    style={styles.previewImage}
                  />
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setAddProductModal(false)}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={addNewProduct}
              >
                <Text style={styles.saveButtonText}>
                  {editingProduct ? 'עדכן מוצר' : 'הוסף מוצר'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  adminControls: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 1,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 4,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 4,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17a2b8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    maxHeight: 50,
  },
  categoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeCategoryButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#fff',
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
  itemsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  itemCardContent: {
    flex: 1,
  },
  itemImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  itemCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'right',
  },
  lowStockText: {
    fontSize: 11,
    color: '#dc3545',
    marginTop: 4,
    textAlign: 'right',
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
    margin: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'right',
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalInfo: {
    alignItems: 'flex-end',
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  modalCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    textAlign: 'right',
  },
  stockText: {
    fontSize: 14,
    color: '#28a745',
    marginTop: 8,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    textAlign: 'right',
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
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
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
  adminProductButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
  },
  editProductButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteProductButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});

export default ShopScreen;