const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let messagingClient = null;

function loadServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      return typeof jsonEnv === "string" ? JSON.parse(jsonEnv) : jsonEnv;
    } catch (err) {
      console.error("[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
      return null;
    }
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) return null;

  const resolved = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.resolve(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(resolved)) {
    console.warn("[FCM] Service account file not found:", resolved);
    return null;
  }

  try {
    return require(resolved);
  } catch (err) {
    console.error("[FCM] Failed to load service account:", err.message);
    return null;
  }
}

function getMessaging() {
  if (messagingClient) return messagingClient;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn(
      "[FCM] Not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env"
    );
    return null;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    messagingClient = admin.messaging();
    return messagingClient;
  } catch (err) {
    console.error("[FCM] Firebase Admin init failed:", err.message);
    return null;
  }
}

function normalizeData(data = {}) {
  const out = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value == null) return;
    out[String(key)] = typeof value === "string" ? value : JSON.stringify(value);
  });
  return out;
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

/**
 * Send FCM to a single device token.
 * @returns {{ success: boolean, messageId?: string, invalidToken?: boolean }}
 */
async function sendPushNotification(token, title, body, data = {}) {
  const client = getMessaging();
  if (!client || !token) {
    return { success: false, reason: "no_client_or_token" };
  }

  const payload = normalizeData(data);
  if (title) payload.title = String(title);
  if (body) payload.body = String(body);

  const message = {
    token,
    notification: { title, body },
    data: payload,
    android: {
      priority: "high",
      notification: {
        channelId: "share_wheels_default",
        sound: "default",
        priority: "high",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  try {
    const messageId = await client.send(message);
    return { success: true, messageId };
  } catch (error) {
    const code = error?.code || error?.errorInfo?.code;
    if (INVALID_TOKEN_CODES.has(code)) {
      return { success: false, invalidToken: true, code };
    }
    console.warn("[FCM] Send failed:", code || error.message);
    return { success: false, reason: error.message, code };
  }
}

function isFirebaseReady() {
  return !!getMessaging();
}

module.exports = {
  sendPushNotification,
  getMessaging,
  isFirebaseReady,
  normalizeData,
};
