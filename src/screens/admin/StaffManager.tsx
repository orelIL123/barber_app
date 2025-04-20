// import firestore from '@react-native-firebase/firestore'; // Commented out
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native'; // Added Alert import
// ... other imports ...

const StaffManagerScreen = () => {
  const [staffList, setStaffList] = useState<any[]>([]); // Changed type temporarily
  const [modalVisible, setModalVisible] = useState(false);
  // ... other state variables ...

  const fetchStaff = useCallback(async () => {
    // Commenting out Firestore logic
    /*
    try {
      const staffCollection = await firestore().collection('users').where('role', '==', 'staff').get();
      const staff = staffCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(staff);
    } catch (error) {
      console.error("Error fetching staff: ", error);
      Alert.alert('Error', 'Could not fetch staff members.');
    }
    */
    console.log("Firestore fetching commented out.");
    setStaffList([]); // Set to empty array for now
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAddStaff = async () => {
    // Commenting out Firestore logic
    /*
    if (!newStaffName || !newStaffEmail || !newStaffSpecialty) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    try {
      // Note: Adding staff might involve more steps like creating an auth user first
      await firestore().collection('users').add({
        displayName: newStaffName,
        email: newStaffEmail,
        role: 'staff',
        staffDetails: {
          specialty: newStaffSpecialty,
        },
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert('Success', 'Staff member added.');
      setModalVisible(false);
      fetchStaff(); // Refresh list
      // Reset fields
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffSpecialty('');
    } catch (error) {
      console.error("Error adding staff: ", error);
      Alert.alert('Error', 'Could not add staff member.');
    }
    */
    console.log("Firestore adding commented out.");
    Alert.alert('Info', 'Adding staff is currently disabled.'); // Fixed linter error
    setModalVisible(false);

  };

  const handleDeleteStaff = async (staffId: string) => {
    // Commenting out Firestore logic
    /*
    try {
      await firestore().collection('users').doc(staffId).delete();
      Alert.alert('Success', 'Staff member deleted.');
      fetchStaff(); // Refresh list
    } catch (error) {
      console.error("Error deleting staff: ", error);
      Alert.alert('Error', 'Could not delete staff member.');
    }
    */
   console.log("Firestore deleting commented out.");
   Alert.alert('Info', 'Deleting staff is currently disabled.'); // Fixed linter error
  };

  // ... rest of the component JSX ...
};

export default StaffManagerScreen; 