import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { getActiveShopItems, ShopItem } from '../../services/firebase';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface ShopScreenProps {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
}

const ShopScreen: React.FC<ShopScreenProps> = ({ 
  onNavigate, 
  onBack
}) => {
  const router = useRouter();
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Safe navigation functions with fallbacks
  const safeNavigate = (screen: string) => {
    console.log('Navigate to:', screen);
    try {
      if (onNavigate && typeof onNavigate === 'function') {
        onNavigate(screen);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      router.replace('/(tabs)');
    }
  };

  const safeBack = () => {
    console.log('Back pressed');
    try {
      if (onBack && typeof onBack === 'function') {
        onBack();
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Back navigation error:', error);
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    loadShopItems();
  }, []);

  const loadShopItems = async () => {
    try {
      setLoading(true);
      console.log('🛒 Loading shop items...');
      const items = await getActiveShopItems();
      console.log('📦 Shop items loaded:', items.length);
      console.log('🖼️ First item image URL:', items[0]?.imageUrl);
      setShopItems(items);
    } catch (error) {
      console.error('❌ Error loading shop items:', error);
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

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="חנות המספרה"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={safeBack}
      />
      
      <View style={styles.content}>
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
            <Text style={styles.loadingText}>טוען מוצרים...</Text>
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
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => {
                      console.log('🔥 Item clicked:', item.name);
                      openItemModal(item);
                    }}
                  >
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      style={styles.itemImage}
                      onLoad={() => console.log('✅ Image loaded:', item.name)}
                      onError={(error) => console.error('❌ Image load error:', item.name, error)}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      <Text style={styles.itemPrice}>{item.price} ₪</Text>
                      {item.stock && Number(item.stock) <= 5 && Number(item.stock) > 0 && (
                        <Text style={styles.lowStockText}>נותרו {item.stock} יחידות</Text>
                      )}
                    </View>
                  </TouchableOpacity>
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
                    
                    {selectedItem.stock && Number(selectedItem.stock) > 0 && (
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
                    <Text style={styles.orderButtonText}>הזמן עכשיו</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeCategoryButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
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
    gap: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShopScreen;