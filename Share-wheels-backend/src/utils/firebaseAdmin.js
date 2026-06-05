const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let messagingClient = null;
let initAttempted = false;

function parseJsonEnv(raw) {
  let trimmed = String(raw).trim();
  if (!trimmed) {
    throw new Error("empty JSON");
  }
  // Render / dashboard paste sometimes wraps the whole JSON in extra quotes
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes("{"))
  ) {
    trimmed = trimmed.slice(1, -1);
  }
  return JSON.parse(trimmed);
}

function normalizeServiceAccount(account) {
  if (!account || typeof account !== "object") {
    console.error("[FCM] Service account is not a valid object");
    return null;
  }

  const { private_key: privateKey, client_email: clientEmail, project_id: projectId } =
    account;

  if (!privateKey || typeof privateKey !== "string") {
    console.error("[FCM] Service account missing private_key");
    return null;
  }
  if (!clientEmail || !projectId) {
    console.error("[FCM] Service account missing client_email or project_id");
    return null;
  }

  return {
    ...account,
    private_key: privateKey.replace(/\\n/g, "\n"),
  };
}

function loadServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      return parseJsonEnv(jsonEnv);
    } catch (err) {
      console.error("[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
      return null;
    }
  }

  const base64Env = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Env) {
    try {
      const json = Buffer.from(String(base64Env).trim(), "base64").toString("utf8");
      return parseJsonEnv(json);
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
      "[FCM] No credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON on Render or add firebase-service-account.json locally."
    );
    return null;
  }

  try {
    const raw = fs.readFileSync(resolved, "utf8");
    return parseJsonEnv(raw);
  } catch (err) {
    console.error("[FCM] Failed to load service account file:", err.message);
    return null;
  }
}

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return true;
  }
  if (initAttempted) {
    return false;
  }
  initAttempted = true;

  const raw = loadServiceAccount();
  if (!raw) {
    return false;
  }

  const serviceAccount = normalizeServiceAccount(raw);
  if (!serviceAccount) {
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    messagingClient = admin.messaging();
    console.log(
      `[FCM] Firebase Admin initialized (project: ${serviceAccount.project_id})`
    );
    return true;
  } catch (err) {
    console.error("[FCM] Firebase Admin init failed:", err.message);
    return false;
  }
}

function getMessaging() {
  if (messagingClient) {
    return messagingClient;
  }

  if (!initializeFirebaseAdmin()) {
    console.warn(
      "[FCM] Not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (or BASE64) on Render — see docs/FCM_RENDER.md"
    );
    return null;
  }

  return messagingClient;
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
        icon: "ic_notification",
        color: "#2563EB",
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
  return initializeFirebaseAdmin() && admin.apps.length > 0;
}

// Eager init so startup logs and /health reflect FCM status immediately
initializeFirebaseAdmin();

module.exports = {
  sendPushNotification,
  getMessaging,
  isFirebaseReady,
  normalizeData,
  initializeFirebaseAdmin,
};
