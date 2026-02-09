import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const deleteUserAuth = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
  }

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot delete admin users');
    }

    await admin.auth().deleteUser(userId);
    console.log(`✅ Deleted user ${userId} from Authentication`);
    
    return { success: true, message: 'User deleted from Authentication' };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return { success: true, message: 'User already deleted' };
    }
    throw new functions.https.HttpsError('internal', `Failed: ${error.message}`);
  }
});

export const updateEmailAndSendReset = functions.https.onCall(async (data, context) => {
  const { firestoreUserId, newEmail } = data;
  
  if (!firestoreUserId || !newEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'firestoreUserId and newEmail are required');
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(firestoreUserId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found in database');
    }

    const userData = userDoc.data();
    // Use the stored authUid or the doc ID if not present
    const authUid = userData?.authUid || firestoreUserId;

    console.log(`🔄 Updating email for user ${authUid} to ${newEmail}`);

    // Update Firebase Auth
    await admin.auth().updateUser(authUid, {
      email: newEmail.toLowerCase(),
      emailVerified: false
    });

    // Update Firestore user document
    await admin.firestore().collection('users').doc(firestoreUserId).update({
      email: newEmail.toLowerCase(),
      emailUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ User ${authUid} updated successfully with new email`);

    return { success: true, email: newEmail.toLowerCase() };
  } catch (error: any) {
    console.error('❌ Error in updateEmailAndSendReset:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to update user email');
  }
});

