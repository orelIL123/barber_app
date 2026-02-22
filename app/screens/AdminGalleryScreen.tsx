import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
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
import { db } from '../../config/firebase';
import { CacheUtils } from '../../services/cache';
import {
  addGalleryImage,
  addShopItem,
  deleteGalleryImage,
  deleteImageFromStorage,
  deleteShopItem,
  GalleryImage,
  getAllStorageImages,
  getAppImages,
  getGalleryImages,
  getShopItems,
  ShopItem,
  updateShopItem,
  uploadImageToStorage,
} from '../../services/firebase';
import { ScissorsLoader } from '../components/ScissorsLoader';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

type ImageTab = 'gallery' | 'background' | 'splash' | 'aboutus';
type AdminTab = ImageTab | 'shop';

interface AdminGalleryScreenProps {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
  initialTab?: AdminTab;
}

const TAB_CONFIG: Record<AdminTab, { label: string; icon: keyof typeof Ionicons.glyphMap; folder?: string; single?: boolean }> = {
  gallery: { label: 'גלריה', icon: 'images', folder: 'gallery' },
  background: { label: 'רקע', icon: 'image', folder: 'backgrounds', single: true },
  splash: { label: 'מסך טעינה', icon: 'phone-portrait', folder: 'splash', single: true },
  aboutus: { label: 'אודותינו', icon: 'information-circle', folder: 'aboutus', single: true },
  shop: { label: 'חנות', icon: 'cart' },
};

const TYPE_LABELS: Record<ImageTab, string> = {
  gallery: 'גלריה',
  background: 'רקע',
  splash: 'מסך טעינה',
  aboutus: 'אודותינו',
};

const AdminGalleryScreen: React.FC<AdminGalleryScreenProps> = ({ onNavigate, onBack, initialTab = 'gallery' }) => {
  const [selectedTab, setSelectedTab] = useState<AdminTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [storageImages, setStorageImages] = useState<Record<string, string[]>>({
    gallery: [],
    backgrounds: [],
    splash: [],
    aboutus: [],
    workers: [],
    shop: [],
  });

  const [shopProducts, setShopProducts] = useState<ShopItem[]>([]);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    stock: '',
    editingId: null as string | null,
  });

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });
  const [storageSelectionMode, setStorageSelectionMode] = useState(false);
  const [selectedStorageUrls, setSelectedStorageUrls] = useState<string[]>([]);
  const splashLocked = selectedTab === 'splash';

  const isImageTab = (tab: AdminTab): tab is ImageTab => tab !== 'shop';

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [imagesData, allStorage, products] = await Promise.all([
        getGalleryImages(),
        getAllStorageImages() as Promise<Record<string, string[]>>,
        getShopItems(),
      ]);

      setImages(imagesData.sort((a, b) => a.order - b.order));
      setStorageImages(allStorage);
      setShopProducts(products);
    } catch (error) {
      console.error('Error loading admin gallery data:', error);
      showToast('שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setStorageSelectionMode(false);
    setSelectedStorageUrls([]);
  }, [selectedTab]);

  const filteredImages = useMemo(() => {
    if (!isImageTab(selectedTab)) return [];
    return images.filter((img) => img.type === selectedTab).sort((a, b) => a.order - b.order);
  }, [images, selectedTab]);

  const storageForCurrentTab = useMemo(() => {
    if (!isImageTab(selectedTab)) return [];
    const folder = TAB_CONFIG[selectedTab].folder;
    return folder ? (storageImages[folder] || []) : [];
  }, [selectedTab, storageImages]);

  const pickImageFromDevice = async (): Promise<string | null> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('נדרשת הרשאה לגלריה', 'error');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) return null;
      return result.assets[0].uri;
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('שגיאה בבחירת תמונה', 'error');
      return null;
    }
  };

  const uploadPickedImage = async (tab: ImageTab): Promise<string | null> => {
    const imageUri = await pickImageFromDevice();
    if (!imageUri) return null;

    const folder = TAB_CONFIG[tab].folder || 'gallery';
    const fileName = `${tab}_${Date.now()}.jpg`;
    return uploadImageToStorage(imageUri, folder, fileName);
  };

  const syncSettingsImage = async (tab: ImageTab, imageUrl: string) => {
    if (tab !== 'background' && tab !== 'aboutus') return;

    const current = await getAppImages();
    const updates = tab === 'background' ? { atmosphereImage: imageUrl } : { aboutUsImage: imageUrl };

    await setDoc(
      doc(db, 'settings', 'images'),
      {
        ...current,
        ...updates,
      },
      { merge: true }
    );
  };

  const replaceSingleImage = async (tab: Extract<ImageTab, 'background' | 'splash' | 'aboutus'>, imageUrl: string) => {
    const existing = images.filter((img) => img.type === tab);

    for (const item of existing) {
      await deleteGalleryImage(item.id);
      if (item.imageUrl !== imageUrl) {
        await deleteImageFromStorage(item.imageUrl);
      }
    }

    await addGalleryImage({ imageUrl, type: tab, order: 0, isActive: true });
    await syncSettingsImage(tab, imageUrl);
  };

  const handlePickAndApply = async () => {
    if (!isImageTab(selectedTab)) return;
    if (selectedTab === 'splash') {
      showToast('מסך טעינה לא זמין לעריכה כרגע', 'info');
      return;
    }

    try {
      setBusy(true);
      const imageUrl = await uploadPickedImage(selectedTab);
      if (!imageUrl) return;

      if (TAB_CONFIG[selectedTab].single) {
        await replaceSingleImage(selectedTab as Extract<ImageTab, 'background' | 'splash' | 'aboutus'>, imageUrl);
        showToast(`תמונת ${TAB_CONFIG[selectedTab].label} עודכנה`);
      } else {
        const sameType = images.filter((img) => img.type === 'gallery');
        const nextOrder = sameType.length ? Math.max(...sameType.map((img) => img.order || 0)) + 1 : 0;
        await addGalleryImage({ imageUrl, type: 'gallery', order: nextOrder, isActive: true });
        showToast('התמונה נוספה לגלריה');
      }

      await CacheUtils.clearHomeData();
      await loadData();
    } catch (error) {
      console.error('Error applying picked image:', error);
      showToast('שגיאה בעדכון התמונה', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSetFromStorage = async (imageUrl: string) => {
    if (!isImageTab(selectedTab)) return;
    if (selectedTab === 'splash') {
      showToast('מסך טעינה לא זמין לעריכה כרגע', 'info');
      return;
    }

    try {
      setBusy(true);

      if (TAB_CONFIG[selectedTab].single) {
        await replaceSingleImage(selectedTab as Extract<ImageTab, 'background' | 'splash' | 'aboutus'>, imageUrl);
        showToast(`תמונת ${TAB_CONFIG[selectedTab].label} הוגדרה בהצלחה`);
      } else {
        const exists = images.some((img) => img.type === 'gallery' && img.imageUrl === imageUrl);
        if (exists) {
          showToast('התמונה כבר קיימת בגלריה', 'info');
          return;
        }

        const sameType = images.filter((img) => img.type === 'gallery');
        const nextOrder = sameType.length ? Math.max(...sameType.map((img) => img.order || 0)) + 1 : 0;
        await addGalleryImage({ imageUrl, type: 'gallery', order: nextOrder, isActive: true });
        showToast('התמונה נוספה מה־Storage לגלריה');
      }

      await CacheUtils.clearHomeData();
      await loadData();
    } catch (error) {
      console.error('Error setting image from storage:', error);
      showToast('שגיאה בהגדרת תמונה', 'error');
    } finally {
      setBusy(false);
    }
  };

  const getCrossUsage = async (imageUrl: string, tab: ImageTab) => {
    const linkedDocs = images.filter((img) => img.imageUrl === imageUrl);
    const usedInOtherTabs = linkedDocs
      .filter((img) => img.type !== tab)
      .map((img) => TYPE_LABELS[img.type]);

    const settings = await getAppImages();
    if (settings.atmosphereImage === imageUrl && tab !== 'background') {
      usedInOtherTabs.push('רקע');
    }
    if (settings.aboutUsImage === imageUrl && tab !== 'aboutus') {
      usedInOtherTabs.push('אודותינו');
    }

    return Array.from(new Set(usedInOtherTabs));
  };

  const removeStorageImageAndLinks = async (imageUrl: string, tab: ImageTab) => {
    const linkedDocs = images.filter((img) => img.imageUrl === imageUrl && img.type === tab);
    for (const linkedDoc of linkedDocs) {
      await deleteGalleryImage(linkedDoc.id);
    }

    await deleteImageFromStorage(imageUrl);

    if (tab === 'background' || tab === 'aboutus') {
      const current = await getAppImages();
      if (
        (tab === 'background' && current.atmosphereImage === imageUrl) ||
        (tab === 'aboutus' && current.aboutUsImage === imageUrl)
      ) {
        await syncSettingsImage(tab, '');
      }
    }
  };

  const handleDeleteStorageImage = (imageUrl: string, tab: ImageTab) => {
    if (tab === 'splash') {
      showToast('מסך טעינה לא זמין לעריכה כרגע', 'info');
      return;
    }
    const tabLabel = TAB_CONFIG[tab].label;
    Alert.alert('מחיקת תמונה', `למחוק את התמונה מ־${tabLabel}? הפעולה תמחק גם קישורים ב־Firestore.`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const crossUsage = await getCrossUsage(imageUrl, tab);
            if (crossUsage.length > 0) {
              showToast(`לא ניתן למחוק: התמונה בשימוש גם ב־${crossUsage.join(', ')}`, 'error');
              return;
            }
            await removeStorageImageAndLinks(imageUrl, tab);
            await CacheUtils.clearHomeData();
            await loadData();
            showToast('התמונה נמחקה בהצלחה');
          } catch (error) {
            console.error('Error deleting storage image:', error);
            showToast('שגיאה במחיקת תמונה', 'error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleDeleteFirestoreImage = (image: GalleryImage) => {
    if (image.type === 'splash') {
      showToast('מסך טעינה לא זמין לעריכה כרגע', 'info');
      return;
    }
    Alert.alert('מחיקת תמונה', 'למחוק את התמונה גם מה־Storage?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deleteGalleryImage(image.id);

            const stillUsed = images.some((img) => img.id !== image.id && img.imageUrl === image.imageUrl);
            const settings = await getAppImages();
            const usedBySettings =
              settings.atmosphereImage === image.imageUrl || settings.aboutUsImage === image.imageUrl;
            if (!stillUsed && !usedBySettings) {
              await deleteImageFromStorage(image.imageUrl);
            }

            if (image.type === 'background' || image.type === 'aboutus') {
              const current = await getAppImages();
              if (
                (image.type === 'background' && current.atmosphereImage === image.imageUrl) ||
                (image.type === 'aboutus' && current.aboutUsImage === image.imageUrl)
              ) {
                await syncSettingsImage(image.type, '');
              }
            }

            await CacheUtils.clearHomeData();
            await loadData();
            showToast('התמונה נמחקה בהצלחה');
          } catch (error) {
            console.error('Error deleting firestore image:', error);
            showToast('שגיאה במחיקת התמונה', 'error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleMoveImage = async (image: GalleryImage, direction: 'up' | 'down') => {
    if (!isImageTab(selectedTab)) return;

    const currentImages = filteredImages;
    const currentIndex = currentImages.findIndex((img) => img.id === image.id);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentImages.length) return;

    const target = currentImages[targetIndex];

    try {
      setBusy(true);
      await Promise.all([
        updateDoc(doc(db, 'gallery', image.id), { order: target.order }),
        updateDoc(doc(db, 'gallery', target.id), { order: image.order }),
      ]);

      await loadData();
      showToast('סדר התמונות עודכן');
    } catch (error) {
      console.error('Error reordering image:', error);
      showToast('שגיאה בעדכון סדר', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReplaceGalleryImage = async (image: GalleryImage) => {
    try {
      setBusy(true);
      const newUrl = await uploadPickedImage('gallery');
      if (!newUrl) return;

      await updateDoc(doc(db, 'gallery', image.id), { imageUrl: newUrl });

      const stillUsed = images.some((img) => img.id !== image.id && img.imageUrl === image.imageUrl);
      if (!stillUsed) {
        await deleteImageFromStorage(image.imageUrl);
      }

      await CacheUtils.clearHomeData();
      await loadData();
      showToast('התמונה הוחלפה בהצלחה');
    } catch (error) {
      console.error('Error replacing gallery image:', error);
      showToast('שגיאה בהחלפת תמונה', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleStorageSelection = (imageUrl: string) => {
    setSelectedStorageUrls((prev) =>
      prev.includes(imageUrl) ? prev.filter((url) => url !== imageUrl) : [...prev, imageUrl]
    );
  };

  const handleBulkDeleteStorageImages = () => {
    if (!isImageTab(selectedTab) || selectedStorageUrls.length === 0) return;
    if (selectedTab === 'splash') {
      showToast('מסך טעינה לא זמין לעריכה כרגע', 'info');
      return;
    }

    Alert.alert('מחיקה מרובה', `למחוק ${selectedStorageUrls.length} תמונות בבת אחת?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק הכל',
        style: 'destructive',
        onPress: async () => {
          const count = selectedStorageUrls.length;
          try {
            setBusy(true);
            let deleted = 0;
            let blocked = 0;
            for (const imageUrl of selectedStorageUrls) {
              const crossUsage = await getCrossUsage(imageUrl, selectedTab);
              if (crossUsage.length > 0) {
                blocked += 1;
                continue;
              }
              await removeStorageImageAndLinks(imageUrl, selectedTab);
              deleted += 1;
            }

            await CacheUtils.clearHomeData();
            await loadData();
            setStorageSelectionMode(false);
            setSelectedStorageUrls([]);
            if (blocked > 0) {
              showToast(`נמחקו ${deleted} מתוך ${count}. ${blocked} בשימוש במקום אחר`, 'info');
            } else {
              showToast(`${count} תמונות נמחקו בהצלחה`);
            }
          } catch (error) {
            console.error('Error deleting selected storage images:', error);
            showToast('שגיאה במחיקה מרובה', 'error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const openNewShopProduct = () => {
    setShopForm({
      name: '',
      description: '',
      price: '',
      category: '',
      imageUrl: '',
      stock: '',
      editingId: null,
    });
    setShopModalVisible(true);
  };

  const openEditShopProduct = (product: ShopItem) => {
    setShopForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      category: product.category || '',
      imageUrl: product.imageUrl,
      stock: product.stock ? String(product.stock) : '',
      editingId: product.id,
    });
    setShopModalVisible(true);
  };

  const uploadShopImage = async () => {
    try {
      setBusy(true);
      const imageUri = await pickImageFromDevice();
      if (!imageUri) return;
      const imageUrl = await uploadImageToStorage(imageUri, 'shop', `shop_${Date.now()}.jpg`);
      setShopForm((prev) => ({ ...prev, imageUrl }));
      showToast('תמונת מוצר עלתה בהצלחה');
    } catch (error) {
      console.error('Error uploading shop image:', error);
      showToast('שגיאה בהעלאת תמונת מוצר', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveShopProduct = async () => {
    if (!shopForm.name.trim() || !shopForm.price.trim() || !shopForm.imageUrl) {
      showToast('נא למלא שם, מחיר ותמונה', 'error');
      return;
    }

    try {
      setBusy(true);
      const payload = {
        name: shopForm.name.trim(),
        description: shopForm.description.trim(),
        price: Number(shopForm.price),
        category: shopForm.category.trim(),
        imageUrl: shopForm.imageUrl,
        stock: shopForm.stock ? Number(shopForm.stock) : undefined,
        isActive: true,
      };

      if (shopForm.editingId) {
        await updateShopItem(shopForm.editingId, payload);
        showToast('המוצר עודכן בהצלחה');
      } else {
        await addShopItem(payload);
        showToast('המוצר נוסף בהצלחה');
      }

      setShopModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error saving shop product:', error);
      showToast('שגיאה בשמירת מוצר', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteShopProduct = (id: string) => {
    Alert.alert('מחיקת מוצר', 'האם למחוק את המוצר?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deleteShopItem(id);
            await loadData();
            showToast('המוצר נמחק');
          } catch (error) {
            console.error('Error deleting shop product:', error);
            showToast('שגיאה במחיקת מוצר', 'error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const currentSingleImage = TAB_CONFIG[selectedTab].single ? filteredImages[0] : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav
          title="ניהול גלריה"
          onBellPress={() => {}}
          onMenuPress={() => {}}
          showBackButton
          onBackPress={onBack || (() => onNavigate?.('admin-home'))}
        />
        <View style={styles.loadingContainer}>
          <ScissorsLoader size={60} color="#2f6fed" accessibilityLabel="טוען" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav
        title="ניהול גלריה"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton
        onBackPress={onBack || (() => onNavigate?.('admin-home'))}
      />

      <View style={styles.content}>
        <View style={styles.tabsWrap}>
          {(Object.keys(TAB_CONFIG) as AdminTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[styles.tabChip, selectedTab === tab && styles.tabChipActive]}
            >
              <Ionicons name={TAB_CONFIG[tab].icon} size={14} color={selectedTab === tab ? '#fff' : '#6b7280'} />
              <Text style={[styles.tabChipText, selectedTab === tab && styles.tabChipTextActive]}>
                {TAB_CONFIG[tab].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent}>
          <View style={styles.actionCard}>
            <View>
              <Text style={styles.actionTitle}>{TAB_CONFIG[selectedTab].label}</Text>
              <Text style={styles.actionSubtitle}>
                {selectedTab === 'shop'
                  ? 'נהל מוצרים, מחירים ותמונות חנות.'
                  : TAB_CONFIG[selectedTab].single
                    ? 'תמונה אחת פעילה בכל רגע. בחירה חדשה מחליפה את הישנה.'
                    : 'אפשר להוסיף כמה תמונות ולסדר אותן לפי סדר תצוגה.'}
              </Text>
            </View>

            {selectedTab === 'shop' ? (
              <TouchableOpacity style={styles.primaryAction} onPress={openNewShopProduct} disabled={busy}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.primaryActionText}>מוצר חדש</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={handlePickAndApply}
                  disabled={busy || storageSelectionMode || splashLocked}
                >
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                  <Text style={styles.primaryActionText}>{TAB_CONFIG[selectedTab].single ? 'בחר והחלף' : 'העלה תמונה'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ghostAction, storageSelectionMode && styles.ghostActionActive]}
                  onPress={() => {
                    setStorageSelectionMode((prev) => !prev);
                    setSelectedStorageUrls([]);
                  }}
                  disabled={busy || splashLocked}
                >
                  <Ionicons name="checkmark-done-outline" size={15} color={storageSelectionMode ? '#fff' : '#2f6fed'} />
                  <Text style={[styles.ghostActionText, storageSelectionMode && styles.ghostActionTextActive]}>
                    בחירה מרובה
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {selectedTab === 'shop' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>מוצרי חנות</Text>
              {shopProducts.length === 0 ? (
                <Text style={styles.emptyText}>עדיין אין מוצרים בחנות.</Text>
              ) : (
                shopProducts.map((product) => (
                  <View key={product.id} style={styles.shopCard}>
                    <Image source={{ uri: product.imageUrl }} style={styles.shopImage} />
                    <View style={styles.shopInfo}>
                      <Text style={styles.shopName}>{product.name}</Text>
                      <Text style={styles.shopMeta}>{product.price} ₪</Text>
                      {!!product.category && <Text style={styles.shopMeta}>קטגוריה: {product.category}</Text>}
                      {!!product.stock && <Text style={styles.shopMeta}>מלאי: {product.stock}</Text>}
                    </View>
                    <View style={styles.shopActions}>
                      <TouchableOpacity onPress={() => openEditShopProduct(product)}>
                        <Ionicons name="create-outline" size={22} color="#2f6fed" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteShopProduct(product.id)}>
                        <Ionicons name="trash-outline" size={22} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <>
              {TAB_CONFIG[selectedTab].single && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>תמונה פעילה</Text>
                  {currentSingleImage ? (
                    <View style={styles.heroCard}>
                      <Image source={{ uri: currentSingleImage.imageUrl }} style={styles.heroImage} />
                      <View style={styles.heroActions}>
                        <TouchableOpacity style={styles.inlineButton} onPress={() => handleDeleteFirestoreImage(currentSingleImage)}>
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                          <Text style={[styles.inlineButtonText, { color: '#dc2626' }]}>מחק</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>אין תמונה פעילה כרגע.</Text>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>תמונות Firestore</Text>
                {filteredImages.length === 0 ? (
                  <Text style={styles.emptyText}>לא נמצאו תמונות לשונית זו.</Text>
                ) : (
                  <View style={styles.grid}>
                    {filteredImages.map((image) => (
                      <View key={image.id} style={styles.imageCard}>
                        <Image source={{ uri: image.imageUrl }} style={styles.imageThumb} />
                        <View style={styles.cardFooter}>
                          <Text style={styles.cardMeta}>סדר: {image.order}</Text>
                          <View style={styles.cardActions}>
                            {selectedTab === 'gallery' && (
                              <>
                                <TouchableOpacity onPress={() => handleMoveImage(image, 'up')}>
                                  <Ionicons name="chevron-up" size={18} color="#2f6fed" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleMoveImage(image, 'down')}>
                                  <Ionicons name="chevron-down" size={18} color="#2f6fed" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleReplaceGalleryImage(image)}>
                                  <Ionicons name="swap-horizontal" size={18} color="#16a34a" />
                                </TouchableOpacity>
                              </>
                            )}
                            {selectedTab !== 'splash' && (
                              <TouchableOpacity onPress={() => handleDeleteFirestoreImage(image)}>
                                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>תמונות Firebase Storage</Text>
                {splashLocked && (
                  <View style={styles.unavailableTag}>
                    <Ionicons name="lock-closed" size={14} color="#92400e" />
                    <Text style={styles.unavailableText}>לא זמין לעריכה (Splash)</Text>
                  </View>
                )}
                {storageSelectionMode && (
                  <View style={styles.bulkBar}>
                    <Text style={styles.bulkBarText}>נבחרו: {selectedStorageUrls.length}</Text>
                    <TouchableOpacity
                      style={[styles.bulkDeleteAction, selectedStorageUrls.length === 0 && styles.bulkDeleteActionDisabled]}
                      onPress={handleBulkDeleteStorageImages}
                      disabled={busy || selectedStorageUrls.length === 0}
                    >
                      <Ionicons name="trash-outline" size={15} color="#fff" />
                      <Text style={styles.bulkDeleteActionText}>מחק נבחרות</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {storageForCurrentTab.length === 0 ? (
                  <Text style={styles.emptyText}>לא נמצאו תמונות ב־Storage לתיקייה זו.</Text>
                ) : (
                  <View style={styles.grid}>
                    {storageForCurrentTab.map((imageUrl) => (
                      <View key={imageUrl} style={styles.imageCard}>
                        <Image source={{ uri: imageUrl }} style={styles.imageThumb} />
                        <View style={styles.cardFooter}>
                          {storageSelectionMode ? (
                            <>
                              <TouchableOpacity style={styles.inlineButton} onPress={() => toggleStorageSelection(imageUrl)}>
                                <Ionicons
                                  name={selectedStorageUrls.includes(imageUrl) ? 'checkbox' : 'square-outline'}
                                  size={16}
                                  color={selectedStorageUrls.includes(imageUrl) ? '#2f6fed' : '#6b7280'}
                                />
                                <Text style={styles.inlineButtonText}>
                                  {selectedStorageUrls.includes(imageUrl) ? 'סומן' : 'סמן'}
                                </Text>
                              </TouchableOpacity>
                              {selectedStorageUrls.includes(imageUrl) && <Text style={styles.selectedBadge}>נבחר</Text>}
                            </>
                          ) : (
                            <>
                              {!splashLocked ? (
                                <>
                                  <TouchableOpacity style={styles.inlineButton} onPress={() => handleSetFromStorage(imageUrl)}>
                                    <Ionicons name="checkmark-circle-outline" size={16} color="#2f6fed" />
                                    <Text style={styles.inlineButtonText}>בחר</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.inlineButton}
                                    onPress={() => isImageTab(selectedTab) && handleDeleteStorageImage(imageUrl, selectedTab)}
                                  >
                                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                                    <Text style={[styles.inlineButtonText, { color: '#dc2626' }]}>מחק</Text>
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <Text style={styles.cardMeta}>לצפייה בלבד</Text>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <Modal visible={shopModalVisible} transparent animationType="slide" onRequestClose={() => setShopModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{shopForm.editingId ? 'עריכת מוצר' : 'מוצר חדש'}</Text>
              <TouchableOpacity onPress={() => setShopModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="שם מוצר"
                placeholderTextColor="#9ca3af"
                value={shopForm.name}
                onChangeText={(text) => setShopForm((prev) => ({ ...prev, name: text }))}
                textAlign="right"
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="תיאור"
                placeholderTextColor="#9ca3af"
                value={shopForm.description}
                onChangeText={(text) => setShopForm((prev) => ({ ...prev, description: text }))}
                textAlign="right"
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="מחיר"
                placeholderTextColor="#9ca3af"
                value={shopForm.price}
                onChangeText={(text) => setShopForm((prev) => ({ ...prev, price: text }))}
                keyboardType="numeric"
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="קטגוריה"
                placeholderTextColor="#9ca3af"
                value={shopForm.category}
                onChangeText={(text) => setShopForm((prev) => ({ ...prev, category: text }))}
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="מלאי (אופציונלי)"
                placeholderTextColor="#9ca3af"
                value={shopForm.stock}
                onChangeText={(text) => setShopForm((prev) => ({ ...prev, stock: text }))}
                keyboardType="numeric"
                textAlign="right"
              />

              <TouchableOpacity style={styles.secondaryAction} onPress={uploadShopImage}>
                <Ionicons name="cloud-upload" size={18} color="#2f6fed" />
                <Text style={styles.secondaryActionText}>{shopForm.imageUrl ? 'החלף תמונה' : 'העלה תמונה'}</Text>
              </TouchableOpacity>

              {!!shopForm.imageUrl && <Image source={{ uri: shopForm.imageUrl }} style={styles.shopPreview} />}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => setShopModalVisible(false)}>
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSave]} onPress={handleSaveShopProduct}>
                <Text style={styles.modalSaveText}>שמור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {busy && (
        <View style={styles.busyOverlay}>
          <ScissorsLoader size={52} color="#fff" accessibilityLabel="מבצע פעולה" />
        </View>
      )}

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  content: {
    flex: 1,
    paddingTop: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsWrap: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabChipActive: {
    backgroundColor: '#2f6fed',
    borderColor: '#2f6fed',
  },
  tabChipText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  tabChipTextActive: {
    color: '#fff',
  },
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 10,
  },
  actionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
    textAlign: 'right',
  },
  actionSubtitle: {
    marginTop: 2,
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 14,
    maxWidth: width * 0.5,
    textAlign: 'right',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
  },
  primaryAction: {
    backgroundColor: '#2f6fed',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  ghostAction: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  ghostActionActive: {
    backgroundColor: '#2f6fed',
    borderColor: '#2f6fed',
  },
  ghostActionText: {
    color: '#2f6fed',
    fontWeight: '700',
    fontSize: 11,
  },
  ghostActionTextActive: {
    color: '#fff',
  },
  bulkDeleteAction: {
    backgroundColor: '#dc2626',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bulkDeleteActionDisabled: {
    backgroundColor: '#9ca3af',
  },
  bulkDeleteActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  bulkBar: {
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkBarText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  unavailableTag: {
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  unavailableText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'right',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'right',
    paddingVertical: 8,
  },
  heroCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  heroImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#e5e7eb',
  },
  heroActions: {
    padding: 6,
    alignItems: 'flex-end',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  imageCard: {
    width: (width - 48) / 3,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  imageThumb: {
    width: '100%',
    height: 80,
    backgroundColor: '#e5e7eb',
  },
  cardFooter: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 4,
  },
  cardMeta: {
    color: '#6b7280',
    fontSize: 10,
    textAlign: 'right',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 7,
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineButtonText: {
    color: '#2f6fed',
    fontSize: 10,
    fontWeight: '700',
  },
  selectedBadge: {
    color: '#0f766e',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  shopCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  shopImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  shopInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  shopName: {
    fontWeight: '800',
    fontSize: 15,
    color: '#111827',
  },
  shopMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  shopActions: {
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalBody: {
    maxHeight: 420,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: '#111827',
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: '#2f6fed',
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  secondaryActionText: {
    color: '#2f6fed',
    fontWeight: '700',
  },
  shopPreview: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  modalActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  modalSave: {
    backgroundColor: '#2f6fed',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '700',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});

export default AdminGalleryScreen;
