import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, getFirestore, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { uploadImageToStorage } from '../../services/firebase';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  inStock: boolean;
  rating: number;
  reviews: number;
}

export default function ShopScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // מצב ניהול של המשתמש

  // הוסף state לטופס מוצר חדש
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'hair_care',
    imageUrl: '',
  });
  const [addingProduct, setAddingProduct] = useState(false);

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

  // Demo data - in real app this would come from Firebase
  const demoProducts: Product[] = [
    {
      id: '1',
      name: 'שמפו מקצועי לגברים',
      description: 'שמפו איכותי לטיפוח השיער הגברי',
      price: 89,
      category: 'hair_care',
      image: 'https://via.placeholder.com/200x200/007bff/ffffff?text=שמפו',
      inStock: true,
      rating: 4.5,
      reviews: 32
    },
    {
      id: '2',
      name: 'קרם עיצוב שיער',
      description: 'קרם עיצוב חזק להחזקה של 24 שעות',
      price: 75,
      category: 'hair_care',
      image: 'https://via.placeholder.com/200x200/28a745/ffffff?text=קרם',
      inStock: true,
      rating: 4.8,
      reviews: 45
    },
    {
      id: '3',
      name: 'שמן זקן פרימיום',
      description: 'שמן זקן טבעי לטיפוח והזנה',
      price: 120,
      category: 'beard_care',
      image: 'https://via.placeholder.com/200x200/fd7e14/ffffff?text=שמן',
      inStock: true,
      rating: 4.9,
      reviews: 67
    },
    {
      id: '4',
      name: 'מברשת זקן מקצועית',
      description: 'מברשת זקן מעץ עם זיפים טבעיים',
      price: 65,
      category: 'beard_care',
      image: 'https://via.placeholder.com/200x200/6c757d/ffffff?text=מברשת',
      inStock: false,
      rating: 4.6,
      reviews: 23
    },
    {
      id: '5',
      name: 'סט טיפוח מלא',
      description: 'סט הכולל שמפו, קרם עיצוב ושמן זקן',
      price: 199,
      category: 'sets',
      image: 'https://via.placeholder.com/200x200/e83e8c/ffffff?text=סט',
      inStock: true,
      rating: 4.7,
      reviews: 89
    },
    {
      id: '6',
      name: 'תער בטיחות קלאסי',
      description: 'תער בטיחות מתכת לגילוח מדויק',
      price: 145,
      category: 'shaving',
      image: 'https://via.placeholder.com/200x200/17a2b8/ffffff?text=תער',
      inStock: true,
      rating: 4.4,
      reviews: 28
    }
  ];

  const categories = [
    { id: 'all', name: 'הכל' },
    { id: 'hair_care', name: 'טיפוח שיער' },
    { id: 'beard_care', name: 'טיפוח זקן' },
    { id: 'shaving', name: 'גילוח' },
    { id: 'sets', name: 'סטים' }
  ];

  // הוסף פונקציה להוספת מוצר ל-Firestore
  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price.trim() || !newProduct.imageUrl) {
      Alert.alert('נא למלא שם, מחיר ותמונה');
      return;
    }
    setAddingProduct(true);
    try {
      const db = getFirestore();
      await addDoc(collection(db, 'shop'), {
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        price: Number(newProduct.price),
        category: newProduct.category,
        imageUrl: newProduct.imageUrl,
        inStock: true,
        createdAt: new Date(),
      });
      setNewProduct({ name: '', description: '', price: '', category: 'hair_care', imageUrl: '' });
      Alert.alert('המוצר נוסף בהצלחה!');
      // רענון מוצרים
      await fetchProducts();
    } catch (e) {
      Alert.alert('שגיאה בהוספת מוצר', e.message);
    } finally {
      setAddingProduct(false);
    }
  };

  // הוסף פונקציה לטעינת מוצרים מ-Firestore
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const db = getFirestore();
      const q = query(collection(db, 'shop'));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(loaded as Product[]);
    } catch (e) {
      Alert.alert('שגיאה בטעינת מוצרים', e.message);
    } finally {
      setLoading(false);
    }
  };

  // שנה את useEffect לטעון מוצרים מה-DB
  useEffect(() => {
    fetchProducts();
  }, []);

  // עדכן את כפתור העלאת תמונה כך שישמור ל-newProduct.imageUrl
  const handlePickImage = async () => {
    const imageUrl = await uploadShopImageFromDevice();
    if (imageUrl) {
      setNewProduct(prev => ({ ...prev, imageUrl }));
    }
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const handleAddToCart = (product: Product) => {
    Alert.alert(
      'נוסף לסל',
      `${product.name} נוסף לסל הקניות`,
      [{ text: 'אישור', style: 'default' }]
    );
  };

  // פונקציה להעלאת תמונה ל-shop ב-Storage
  const uploadShopImageFromDevice = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('נדרשת הרשאה לגישה לגלריה');
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const downloadURL = await uploadImageToStorage(imageUri, 'shop', fileName);
        return downloadURL;
      }
    } catch (error) {
      Alert.alert('שגיאה בהעלאת התמונה', error.message);
    }
    return null;
  };

  // מספר הוואטסאפ של המנהל (עדכן לפי הצורך)
  const managerPhone = '972501234567';

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="חנות" 
        onBellPress={() => {}} 
        onMenuPress={() => {}} 
        showBackButton={true}
        onBackPress={handleBack}
        showCloseButton={true}
        onClosePress={handleClose}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>חנות TURGI</Text>
            <Text style={styles.subtitle}>מוצרי טיפוח מקצועיים לגברים</Text>
          </View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  {selectedCategory === category.id && (
                    <LinearGradient
                      colors={['#333333', '#1a1a1a', '#000000']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.categoryGradient}
                    />
                  )}
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category.id && styles.categoryButtonTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Products Grid */}
          <View style={styles.productsGrid}>
            {filteredProducts.length === 0 ? (
              <Text style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>לא נמצאו מוצרים בקטגוריה זו.</Text>
            ) : (
              filteredProducts.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <Image
                    source={product.imageUrl ? { uri: product.imageUrl } : { uri: 'https://via.placeholder.com/200x200/cccccc/ffffff?text=No+Image' }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDescription}>{product.description}</Text>
                  <Text style={styles.productCategory}>{categories.find(c => c.id === product.category)?.name || ''}</Text>
                  <TouchableOpacity
                    style={[styles.addToCartButton, { marginTop: 8 }]}
                    onPress={() => {
                      const message = `היי אחי, מעוניין במוצר הזה.\n${product.name}\n${product.description}`;
                      const url = `https://wa.me/${managerPhone}?text=${encodeURIComponent(message)}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Text style={styles.addToCartText}>הוסף לסל (שלח לוואטסאפ)</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
          {/* רק אדמין רואה את הכפתור */}
          {isAdmin && (
            <View style={{margin: 16, backgroundColor: '#222', borderRadius: 12, padding: 16}}>
              <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>הוסף מוצר חדש</Text>
              <TextInput
                placeholder="שם המוצר"
                value={newProduct.name}
                onChangeText={text => setNewProduct(prev => ({ ...prev, name: text }))}
                style={{backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 8, marginBottom: 8}}
                placeholderTextColor="#aaa"
              />
              <TextInput
                placeholder="תיאור"
                value={newProduct.description}
                onChangeText={text => setNewProduct(prev => ({ ...prev, description: text }))}
                style={{backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 8, marginBottom: 8}}
                placeholderTextColor="#aaa"
              />
              <TextInput
                placeholder="מחיר"
                value={newProduct.price}
                onChangeText={text => setNewProduct(prev => ({ ...prev, price: text }))}
                keyboardType="numeric"
                style={{backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 8, marginBottom: 8}}
                placeholderTextColor="#aaa"
              />
              <View style={{flexDirection: 'row', marginBottom: 8}}>
                {categories.filter(c => c.id !== 'all').map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={{marginRight: 8, backgroundColor: newProduct.category === c.id ? '#007bff' : '#333', borderRadius: 8, padding: 8}}
                    onPress={() => setNewProduct(prev => ({ ...prev, category: c.id }))}
                  >
                    <Text style={{color: newProduct.category === c.id ? '#fff' : '#aaa'}}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={{backgroundColor: '#444', borderRadius: 8, padding: 10, marginBottom: 8}} onPress={handlePickImage}>
                <Text style={{color: '#fff', textAlign: 'center'}}>{newProduct.imageUrl ? 'החלף תמונה' : 'העלה תמונה'}</Text>
              </TouchableOpacity>
              {newProduct.imageUrl ? (
                <Image source={{ uri: newProduct.imageUrl }} style={{width: 100, height: 100, borderRadius: 8, alignSelf: 'center', marginBottom: 8}} />
              ) : null}
              <TouchableOpacity style={{backgroundColor: '#007bff', borderRadius: 8, padding: 12, marginTop: 8}} onPress={handleAddProduct} disabled={addingProduct}>
                <Text style={{color: 'white', fontWeight: 'bold', textAlign: 'center'}}>{addingProduct ? 'מוסיף...' : 'הוסף מוצר'}</Text>
              </TouchableOpacity>
            </View>
          )}
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
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesScroll: {
    paddingHorizontal: 4,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryButtonActive: {
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 40,
  },
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right',
  },
  ratingContainer: {
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  ratingText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 11,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addToCartGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
