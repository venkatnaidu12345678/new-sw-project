const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let messagingClient = null;

function loadServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      const trimmed = String(jsonEnv).trim();
      return JSON.parse(trimmed);
    } catch (err) {
      console.error("[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
      return null;
    }
  }

  const base64Env = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Env) {
    try {
      const json = Buffer.from(String(base64Env).trim(), "base64").toString("utf8");
      return JSON.parse(json);
    } catch (err) {
      console.error("[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_BASE64:", err.message);
      return null;
    }
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = [];
  if (serviceAccountPath) {
    candidates.push(
      path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath)
    );
  }
  candidates.push(path.resolve(process.cwd(), "firebase-service-account.json"));
  candidates.push(path.resolve(__dirname, "../../firebase-service-account.json"));

  const resolved = candidates.find((p) => fs.existsSync(p));
  if (!resolved) {
    console.warn(
      "[FCM] No service account file. Set FIREBASE_SERVICE_ACCOUNT_JSON on Render or add firebase-service-account.json"
    );
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
      "[FCM] Not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (or BASE64) on Render — see docs/FCM_RENDER.md"
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
        visibility: "public",
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          badge: 1,
          "content-available": 1,
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
