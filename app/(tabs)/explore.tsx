import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '../../services/firebase';
import AdminGalleryScreen from '../screens/AdminGalleryScreen';
import ShopScreen from './explore-client'; // (create this file for the client shop UI, move current code there)

export default function ExploreTab() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      const user = getCurrentUser();
      setIsAdmin(user?.type === 'admin');
    })();
  }, []);

  if (isAdmin) {
    return <AdminGalleryScreen initialTab="shop" />;
  }
  return <ShopScreen />;
}
