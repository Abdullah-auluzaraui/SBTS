import mongoose from 'mongoose';
import User from '../models/User';

interface IFirebaseAdmin {
  messaging: () => {
    send: (payload: unknown) => Promise<unknown>;
  };
}

let adminInstance: IFirebaseAdmin | null | boolean = null;
let messagingReady = false;

/**
 * Initializes firebase-admin on the first call.
 * Returns false (silently) if credentials are missing — keeps the system running
 * without FCM during development.
 */
function initAdmin(): boolean {
  if (messagingReady) return true; // already initialized
  if (adminInstance === false) return false; // already tried and failed

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('[FCMService] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled.');
    adminInstance = false; // mark as "tried but not configured"
    return false;
  }

  try {
    const { initializeApp, cert } = require('firebase-admin/app');
    const { getMessaging } = require('firebase-admin/messaging');
    const serviceAccount = JSON.parse(raw);
    const firebaseApp = initializeApp({
      credential: cert(serviceAccount)
    });
    adminInstance = { messaging: () => getMessaging(firebaseApp) };
    messagingReady = true;
    console.log('[FCMService] Firebase Admin SDK initialized ✅');
    return true;
  } catch (err: unknown) {
    console.error('[FCMService] Failed to initialize Firebase Admin SDK:', err instanceof Error ? err.message : String(err));
    adminInstance = false;
    return false;
  }
}

/**
 * Sends a push notification to a user via their stored FCM token.
 * Token should be stored on the User document: user.fcmToken (String).
 * This function is intentionally fire-and-forget — it never throws.
 *
 * @param userId
 * @param options
 */
export async function sendPush(
  userId: string | mongoose.Types.ObjectId,
  options: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  try {
    const { title, body, data = {} } = options;
    if (!initAdmin()) return; // FCM not configured — skip silently

    const user = await User.findById(userId).select('fcmToken').lean();
    if (!user?.fcmToken) return; // User has no registered device token

    await (adminInstance as IFirebaseAdmin).messaging().send({
      token: user.fcmToken,
      notification: { title, body },
      // FCM data values must all be strings
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: { priority: 'high' },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } }
      }
    });

    console.log(`[FCMService] Push sent to user ${userId}: "${title}"`);
  } catch (err: unknown) {
    // FCM errors are non-fatal — log and continue
    console.error(`[FCMService] Push failed for user ${userId}:`, err instanceof Error ? err.message : String(err));
  }
}
