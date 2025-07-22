import React, { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile } from '../../services/firebase';
import AdminGalleryScreen from '../screens/AdminGalleryScreen';
import ShopScreen from './explore-client';

export default function ExploreTab() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      const user = getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.uid);
        setIsAdmin(profile?.isAdmin === true);
      }
    })();
  }, []);

  if (isAdmin) {
    return <AdminGalleryScreen initialTab="shop" />;
  }
  return <ShopScreen />;
}
