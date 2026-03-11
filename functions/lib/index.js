"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAdminFlagChanged = exports.onNewUser = exports.onNewAppointment = exports.syncAdminClaims = exports.setAdminClaim = exports.updateEmailAndSendReset = exports.deleteUserAuth = exports.checkUserExistsForLogin = exports.sendPushNotification = void 0;
const expo_server_sdk_1 = require("expo-server-sdk");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const expoAccessToken = (0, params_1.defineSecret)('EXPO_ACCESS_TOKEN');
/**
 * Cloud Function לשליחת Push דרך Expo (עם Access Token)
 * פותר את שגיאת 403 "Insufficient permissions"
 *
 * הגדרת Token: firebase functions:secrets:set EXPO_ACCESS_TOKEN
 * לקבלת Token: https://expo.dev/accounts/orel895/settings/access-tokens
 */
exports.sendPushNotification = (0, https_1.onCall)({ secrets: [expoAccessToken] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { pushToken, title, body, data: payloadData } = request.data || {};
    if (!pushToken || !title || !body) {
        throw new https_1.HttpsError('invalid-argument', 'pushToken, title, body are required');
    }
    if (!pushToken.startsWith('ExponentPushToken[')) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid Expo push token format');
    }
    const token = expoAccessToken.value();
    if (!token) {
        throw new https_1.HttpsError('failed-precondition', 'Push notifications not configured. Run: firebase functions:secrets:set EXPO_ACCESS_TOKEN');
    }
    const expo = new expo_server_sdk_1.Expo({ accessToken: token });
    const message = {
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
            if ((ticket === null || ticket === void 0 ? void 0 : ticket.status) === 'error') {
                console.error('📱 Push ticket error:', ticket.message, ticket.details);
                throw new Error(ticket.message || 'Push delivery error');
            }
            if ((ticket === null || ticket === void 0 ? void 0 : ticket.status) === 'ok') {
                console.log('✅ Push sent successfully', ticket.id ? `(id: ${ticket.id})` : '');
            }
        }
        return { success: true };
    }
    catch (error) {
        console.error('❌ Error sending push:', error);
        throw new https_1.HttpsError('internal', error.message || 'Failed to send push');
    }
});
/**
 * checkUserExistsForLogin — קריאה ללא אימות, לבדיקת התחברות.
 * פותר את הבעיה: Firestore rules חוסמים קריאת users למשתמש לא מחובר.
 * הפונקציה רצה עם Admin SDK ויכולה לקרוא את כל המסמכים.
 *
 * מחזירה: { exists, hasPassword, email?, uid?, isAdmin? }
 */
exports.checkUserExistsForLogin = functions.https.onCall(async (data, context) => {
    const { phoneNumber } = data || {};
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'phoneNumber is required');
    }
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const possiblePhones = [
        phoneNumber,
        `+972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`,
        `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`,
        `0${cleanPhone.startsWith('972') ? cleanPhone.substring(3) : cleanPhone}`,
        cleanPhone,
    ];
    const usersRef = admin.firestore().collection('users');
    for (const phoneFormat of possiblePhones) {
        const snapshot = await usersRef.where('phone', '==', phoneFormat).limit(1).get();
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            return {
                exists: true,
                hasPassword: userData.hasPassword || false,
                uid: userDoc.id,
                isAdmin: userData.isAdmin || false,
                email: userData.email,
            };
        }
    }
    const possibleEmails = [
        `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}@ronbarber.app`,
        `${cleanPhone}@ronbarber.app`,
        `${cleanPhone}@sms.barbershop.local`,
        `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}@sms.barbershop.local`,
        `${cleanPhone}@phonesign.local`,
        `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}@phonesign.local`,
        `${cleanPhone}@temp.turgi.com`,
        `972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}@temp.turgi.com`,
    ];
    for (const emailFormat of possibleEmails) {
        const snapshot = await usersRef.where('email', '==', emailFormat).limit(1).get();
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            return {
                exists: true,
                hasPassword: userData.hasPassword || false,
                uid: userDoc.id,
                isAdmin: userData.isAdmin || false,
                email: userData.email,
            };
        }
    }
    return { exists: false, hasPassword: false };
});
exports.deleteUserAuth = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const callerUid = context.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    if (!callerDoc.exists || !((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
    }
    const { userId } = data;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }
    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (userDoc.exists && ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.isAdmin)) {
            throw new functions.https.HttpsError('permission-denied', 'Cannot delete admin users');
        }
        await admin.auth().deleteUser(userId);
        console.log(`✅ Deleted user ${userId} from Authentication`);
        return { success: true, message: 'User deleted from Authentication' };
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            return { success: true, message: 'User already deleted' };
        }
        throw new functions.https.HttpsError('internal', `Failed: ${error.message}`);
    }
});
exports.updateEmailAndSendReset = functions.https.onCall(async (data, context) => {
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
        const authUid = (userData === null || userData === void 0 ? void 0 : userData.authUid) || firestoreUserId;
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
    }
    catch (error) {
        console.error('❌ Error in updateEmailAndSendReset:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to update user email');
    }
});
// ──────────────────────────────────────────────
//  Custom Claims – Admin role management
// ──────────────────────────────────────────────
/**
 * setAdminClaim — callable by an existing admin.
 * Sets { admin: true } on a user's Auth token.
 * Usage from client: httpsCallable(functions, 'setAdminClaim')({ uid: 'xxx' })
 */
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
    var _a;
    // Only allow calls from authenticated admins
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    // Check caller is admin via custom claim OR Firestore fallback
    const callerClaims = context.auth.token;
    let callerIsAdmin = callerClaims.admin === true;
    if (!callerIsAdmin) {
        // Fallback: check Firestore
        const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
        callerIsAdmin = callerDoc.exists && ((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin) === true;
    }
    if (!callerIsAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can set admin claims');
    }
    const { uid } = data;
    if (!uid || typeof uid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'uid (string) is required');
    }
    try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        console.log(`✅ Admin claim set for user ${uid}`);
        return { success: true, message: `Admin claim set for ${uid}` };
    }
    catch (error) {
        console.error(`❌ Error setting admin claim for ${uid}:`, error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
/**
 * syncAdminClaims — one-time / maintenance callable.
 * Scans all Firestore users with isAdmin=true and sets { admin: true } claim.
 * Call once after deploying, then never again (unless you add new admins manually).
 * Can be called by any authenticated admin.
 */
exports.syncAdminClaims = functions.https.onCall(async (_data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    // Allow call from Firestore-based admin (for first-time bootstrap)
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || !((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can sync claims');
    }
    try {
        const snapshot = await admin.firestore()
            .collection('users')
            .where('isAdmin', '==', true)
            .get();
        const results = [];
        for (const userDoc of snapshot.docs) {
            const userData = userDoc.data();
            const authUid = userData.authUid || userDoc.id;
            try {
                await admin.auth().setCustomUserClaims(authUid, { admin: true });
                results.push(`✅ ${authUid} (${userData.email || 'no email'})`);
                console.log(`✅ Admin claim synced for ${authUid}`);
            }
            catch (err) {
                results.push(`❌ ${authUid}: ${err.message}`);
                console.error(`❌ Failed to sync claim for ${authUid}:`, err);
            }
        }
        // Also set the claim for the caller
        await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });
        results.push(`✅ ${context.auth.uid} (caller)`);
        return { success: true, synced: results.length, details: results };
    }
    catch (error) {
        console.error('❌ Error syncing admin claims:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ──────────────────────────────────────────────
//  Helper: send Expo push to all admin users
// ──────────────────────────────────────────────
async function sendPushToAdmins(title, body, data, accessToken) {
    const usersSnap = await admin.firestore()
        .collection('users')
        .where('isAdmin', '==', true)
        .get();
    const tokens = [];
    const adminUids = [];
    usersSnap.forEach((doc) => {
        var _a;
        const d = doc.data();
        const token = (_a = d.pushToken) !== null && _a !== void 0 ? _a : d.expoPushToken;
        if (token && token.startsWith('ExponentPushToken[')) {
            tokens.push(token);
            adminUids.push(doc.id);
        }
    });
    if (tokens.length === 0) {
        console.log('onNewAppointment/onNewUser: no admin push tokens found');
        return;
    }
    const expo = new expo_server_sdk_1.Expo({ accessToken });
    const messages = tokens.map((to) => ({
        to,
        sound: 'default',
        title,
        body,
        data,
    }));
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            tickets.forEach((ticket) => {
                if (ticket.status === 'error') {
                    console.error('Push ticket error:', ticket.message, ticket.details);
                }
            });
        }
        catch (err) {
            console.error('Error sending push chunk:', err);
        }
    }
    // Save notification to each admin's inbox
    const batch = admin.firestore().batch();
    adminUids.forEach((uid) => {
        const ref = admin.firestore().collection('notifications').doc();
        batch.set(ref, {
            userId: uid,
            title,
            body,
            data,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
}
// ──────────────────────────────────────────────
//  onNewAppointment — notify admin when a customer books
// ──────────────────────────────────────────────
exports.onNewAppointment = functions
    .runWith({ secrets: ['EXPO_ACCESS_TOKEN'] })
    .firestore.document('appointments/{appointmentId}')
    .onCreate(async (snap, context) => {
    var _a, _b;
    try {
        const appointment = snap.data();
        const appointmentId = context.params.appointmentId;
        // Read admin notification settings
        const settingsDoc = await admin.firestore()
            .collection('adminSettings')
            .doc('notifications')
            .get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        const enabled = (_a = settings === null || settings === void 0 ? void 0 : settings.newAppointmentBooked) !== null && _a !== void 0 ? _a : true;
        if (!enabled) {
            console.log('onNewAppointment: newAppointmentBooked disabled, skipping');
            return;
        }
        // Resolve customer name
        let customerName = 'לקוח';
        const userId = appointment.userId || '';
        if (userId && userId !== 'manual-client') {
            try {
                const userDoc = await admin.firestore().collection('users').doc(userId).get();
                if (userDoc.exists) {
                    customerName = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.displayName) || 'לקוח';
                }
            }
            catch (_) { /* ignore */ }
        }
        else if (appointment.clientName) {
            customerName = appointment.clientName;
        }
        // Format date/time
        let dateStr = '';
        let timeStr = '';
        try {
            const dateVal = appointment.date;
            const asDate = typeof (dateVal === null || dateVal === void 0 ? void 0 : dateVal.toDate) === 'function' ? dateVal.toDate() : new Date(dateVal);
            dateStr = asDate.toLocaleDateString('he-IL');
            timeStr = asDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        }
        catch (_) { /* ignore */ }
        const title = 'תור חדש! 📅';
        const body = `${customerName} קבע תור ל-${dateStr} ב-${timeStr}`;
        const accessToken = process.env.EXPO_ACCESS_TOKEN || '';
        if (!accessToken) {
            console.error('onNewAppointment: EXPO_ACCESS_TOKEN secret not available');
            return;
        }
        await sendPushToAdmins(title, body, { appointmentId }, accessToken);
        console.log(`✅ onNewAppointment: admin push sent for appointment ${appointmentId}`);
    }
    catch (error) {
        console.error('❌ onNewAppointment error:', error);
    }
});
// ──────────────────────────────────────────────
//  onNewUser — notify admin when a new user registers
// ──────────────────────────────────────────────
exports.onNewUser = functions
    .runWith({ secrets: ['EXPO_ACCESS_TOKEN'] })
    .firestore.document('users/{userId}')
    .onCreate(async (snap, context) => {
    var _a;
    try {
        const userData = snap.data();
        const userId = context.params.userId;
        // Skip admin users registering themselves
        if (userData.isAdmin) {
            console.log('onNewUser: skipping admin user');
            return;
        }
        // Read admin notification settings
        const settingsDoc = await admin.firestore()
            .collection('adminSettings')
            .doc('notifications')
            .get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        const enabled = (_a = settings === null || settings === void 0 ? void 0 : settings.newUserRegistered) !== null && _a !== void 0 ? _a : true;
        if (!enabled) {
            console.log('onNewUser: newUserRegistered disabled, skipping');
            return;
        }
        const displayName = userData.displayName || 'משתמש חדש';
        const phoneNumber = userData.phone || '';
        const title = 'משתמש חדש נרשם! 🎉';
        const body = phoneNumber
            ? `${displayName} נרשם לאפליקציה עם מספר ${phoneNumber}`
            : `${displayName} נרשם לאפליקציה`;
        const accessToken = process.env.EXPO_ACCESS_TOKEN || '';
        if (!accessToken) {
            console.error('onNewUser: EXPO_ACCESS_TOKEN secret not available');
            return;
        }
        await sendPushToAdmins(title, body, { type: 'new_user', userId, userName: displayName, phoneNumber }, accessToken);
        console.log(`✅ onNewUser: admin push sent for new user ${userId}`);
    }
    catch (error) {
        console.error('❌ onNewUser error:', error);
    }
});
/**
 * onAdminFlagChanged — Firestore trigger.
 * When a user document's isAdmin field changes to true, automatically set the claim.
 * When it changes to false, remove the claim.
 */
exports.onAdminFlagChanged = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const before = change.before.data();
    const after = change.after.data();
    // Document deleted
    if (!after)
        return;
    const wasBefore = (before === null || before === void 0 ? void 0 : before.isAdmin) === true;
    const isNow = after.isAdmin === true;
    // No change in admin status
    if (wasBefore === isNow)
        return;
    const authUid = after.authUid || userId;
    try {
        if (isNow) {
            await admin.auth().setCustomUserClaims(authUid, { admin: true });
            console.log(`✅ Admin claim ADDED for ${authUid}`);
        }
        else {
            await admin.auth().setCustomUserClaims(authUid, { admin: false });
            console.log(`🚫 Admin claim REMOVED for ${authUid}`);
        }
    }
    catch (error) {
        console.error(`❌ Error updating admin claim for ${authUid}:`, error);
    }
});
//# sourceMappingURL=index.js.map