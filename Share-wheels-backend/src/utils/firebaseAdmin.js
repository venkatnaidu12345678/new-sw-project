const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let messagingClient = null;
let initAttempted = false;
let lastFcmError = null;
let configuredProjectId = null;

function setFcmError(message) {
  lastFcmError = message;
}

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
    setFcmError("missing_private_key");
    console.error("[FCM] Service account missing private_key");
    return null;
  }
  if (!clientEmail || !projectId) {
    setFcmError("missing_client_email_or_project_id");
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
      setFcmError(`invalid_json_env: ${err.message}`);
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
      setFcmError(`invalid_base64_env: ${err.message}`);
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
    setFcmError("no_credentials");
    console.warn(
      "[FCM] No credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON on Render or add firebase-service-account.json locally."
    );
    return null;
  }

  try {
    const raw = fs.readFileSync(resolved, "utf8");
    return parseJsonEnv(raw);
  } catch (err) {
    setFcmError(`file_load_failed: ${err.message}`);
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
    if (!lastFcmError) {
      setFcmError("invalid_service_account");
    }
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    messagingClient = admin.messaging();
    configuredProjectId = serviceAccount.project_id;
    lastFcmError = null;
    console.log(
      `[FCM] Firebase Admin initialized (project: ${serviceAccount.project_id})`
    );
    return true;
  } catch (err) {
    setFcmError(`init_failed: ${err.message}`);
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

const resolveAndroidChannel = (type = "") => {
  const key = String(type || "").toLowerCase();
  if (key === "chat_message") return "share_wheels_chat";
  if (
    [
      "ride_start_reminder",
      "ride_expired",
      "passenger_request_expired",
      "courier_request_expired",
    ].includes(key)
  ) {
    return "share_wheels_reminders";
  }
  return "share_wheels_default";
};

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

  const notifType = payload.type || "general";
  const channelId = resolveAndroidChannel(notifType);
  const rideId = payload.rideId ? String(payload.rideId) : "";
  const tag =
    payload.notificationId ||
    payload.passengerRideId ||
    payload.courierId ||
    `${notifType}-${rideId || "general"}`;

  const message = {
    token,
    notification: { title, body },
    data: payload,
    android: {
      priority: "high",
      directBootOk: true,
      ttl: 86400,
      collapseKey: rideId || notifType,
      notification: {
        channelId,
        tag: String(tag),
        icon: "ic_notification",
        color: "#2563EB",
        sound: "default",
        notificationPriority: "PRIORITY_HIGH",
        visibility: "public",
        defaultSound: true,
        defaultVibrateTimings: true,
        notificationCount: 1,
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
        ...(rideId ? { "apns-collapse-id": rideId } : {}),
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          badge: 1,
          "content-available": 1,
          ...(rideId ? { "thread-id": rideId } : {}),
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
    console.warn("[FCM] Send failed:", code || error.message, error?.message || "");
    return { success: false, reason: error.message, code };
  }
}

function isFirebaseReady() {
  return initializeFirebaseAdmin() && admin.apps.length > 0;
}

function getFirebaseStatus() {
  const ready = isFirebaseReady();
  return {
    ready,
    projectId: configuredProjectId,
    hasJsonEnv: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    hasBase64Env: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64),
    jsonEnvLength: process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.length || 0,
    error: ready ? null : lastFcmError || "not_initialized",
  };
}

// Eager init so startup logs and /health reflect FCM status immediately
initializeFirebaseAdmin();

module.exports = {
  sendPushNotification,
  getMessaging,
  isFirebaseReady,
  getFirebaseStatus,
  normalizeData,
  initializeFirebaseAdmin,
};
