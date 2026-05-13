// src/utils/FCMService.js
// Firebase Admin SDK — initialized lazily on first sendPush() call.
// To activate: set FIREBASE_SERVICE_ACCOUNT_JSON in your .env file.
// The value must be the full contents of your Firebase serviceAccountKey.json,
// compacted to a single line (no newlines), like:
//   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

const User = require('../models/User');

let admin = null;
let messagingReady = false;

/**
 * Initializes firebase-admin on the first call.
 * Returns false (silently) if credentials are missing — keeps the system running
 * without FCM during development.
 */
function initAdmin() {
  if (messagingReady) return true; // already initialized
  if (admin) return false;         // already tried and failed

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('[FCMService] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled.');
    admin = false; // mark as "tried but not configured"
    return false;
  }

  try {
    const firebaseAdmin = require('firebase-admin');
    const serviceAccount = JSON.parse(raw);
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount)
    });
    admin = firebaseAdmin;
    messagingReady = true;
    console.log('[FCMService] Firebase Admin SDK initialized ✅');
    return true;
  } catch (err) {
    console.error('[FCMService] Failed to initialize Firebase Admin SDK:', err.message);
    admin = false;
    return false;
  }
}

/**
 * Sends a push notification to a user via their stored FCM token.
 * Token should be stored on the User document: user.fcmToken (String).
 * This function is intentionally fire-and-forget — it never throws.
 *
 * @param {ObjectId|string} userId
 * @param {{ title: string, body: string, data?: Record<string,string> }} options
 */
async function sendPush(userId, { title, body, data = {} }) {
  try {
    if (!initAdmin()) return; // FCM not configured — skip silently

    const user = await User.findById(userId).select('fcmToken').lean();
    if (!user?.fcmToken) return; // User has no registered device token

    await admin.messaging().send({
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
  } catch (err) {
    // FCM errors are non-fatal — log and continue
    console.error(`[FCMService] Push failed for user ${userId}:`, err.message);
  }
}

module.exports = { sendPush };
