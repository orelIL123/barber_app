import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

admin.initializeApp();

const expoAccessToken = defineSecret('EXPO_ACCESS_TOKEN');

/**
 * Cloud Function לשליחת Push דרך Expo (עם Access Token)
 * פותר את שגיאת 403 "Insufficient permissions"
 *
 * הגדרת Token: firebase functions:secrets:set EXPO_ACCESS_TOKEN
 * לקבלת Token: https://expo.dev/accounts/orel895/settings/access-tokens
 */
export const sendPushNotification = onCall(
  { secrets: [expoAccessToken] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { pushToken, title, body, data: payloadData } = request.data || {};
    if (!pushToken || !title || !body) {
      throw new HttpsError('invalid-argument', 'pushToken, title, body are required');
    }
    if (!pushToken.startsWith('ExponentPushToken[')) {
      throw new HttpsError('invalid-argument', 'Invalid Expo push token format');
    }

    const token = expoAccessToken.value();
    if (!token) {
      throw new HttpsError('failed-precondition', 'Push notifications not configured. Run: firebase functions:secrets:set EXPO_ACCESS_TOKEN');
    }

    const expo = new Expo({ accessToken: token });
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: payloadData || {},
    };

    try {
      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        const ticket = tickets[0];
        if (ticket?.status === 'error') {
          console.error('📱 Push ticket error:', ticket.message, ticket.details);
          throw new Error(ticket.message || 'Push delivery error');
        }
        if (ticket?.status === 'ok') {
          console.log('✅ Push sent successfully', ticket.id ? `(id: ${ticket.id})` : '');
        }
      }
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error sending push:', error);
      throw new HttpsError('internal', error.message || 'Failed to send push');
    }
  }
);

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

