const crypto = require("crypto");
const admin = require("firebase-admin");
const { initializeFirebaseAdmin, isFirebaseReady } = require("./firebaseAdmin");

function getAuth() {
  if (!initializeFirebaseAdmin()) return null;
  return admin.auth();
}

const getWebApiKey = () => String(process.env.FIREBASE_WEB_API_KEY || "").trim();

const isConfigurationNotFoundError = (message) => {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("configuration_not_found") ||
    text.includes("configuration-not-found") ||
    text.includes("no configuration corresponding to the provided identifier")
  );
};

const isPasswordResetConfigured = () => isFirebaseReady() && Boolean(getWebApiKey());

/**
 * Probe Email/Password by creating a temp Firebase user and generating a reset link.
 * sendOobCode alone returns 200 even when no user exists (no email is sent).
 */
const probeFirebaseAuthConfiguration = async () => {
  if (!isFirebaseReady()) {
    return { ok: false, reason: "firebase_admin_not_ready" };
  }
  if (!getWebApiKey()) {
    return { ok: false, reason: "firebase_web_api_key_missing" };
  }

  const auth = getAuth();
  if (!auth) {
    return { ok: false, reason: "firebase_auth_unavailable" };
  }

  const probeEmail = `health-probe-${Date.now()}@sharewheels.app`;
  const probePassword = crypto.randomBytes(18).toString("base64url");
  let probeUid = null;

  try {
    const created = await auth.createUser({
      email: probeEmail,
      password: probePassword,
      emailVerified: true,
    });
    probeUid = created.uid;
    await auth.generatePasswordResetLink(probeEmail);
    return { ok: true, method: "admin_reset_link" };
  } catch (error) {
    if (isConfigurationNotFoundError(error?.message || error?.code)) {
      return {
        ok: false,
        reason: "email_password_provider_disabled",
        hint: "Firebase Console → Authentication → Sign-in method → enable Email/Password → Save",
      };
    }
    return { ok: false, reason: error?.message || "probe_failed" };
  } finally {
    if (probeUid) {
      try {
        await auth.deleteUser(probeUid);
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
};

const getPasswordResetStatus = () => ({
  configured: isPasswordResetConfigured(),
  provider: "firebase_auth",
  firebaseAdminReady: isFirebaseReady(),
  webApiKeySet: Boolean(getWebApiKey()),
});

async function ensureFirebaseAuthUser(email, password) {
  const auth = getAuth();
  if (!auth) return { ok: false, reason: "firebase_not_configured" };

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return { ok: false, reason: "invalid_email" };

  try {
    await auth.getUserByEmail(normalizedEmail);
    return { ok: true, existed: true };
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      console.warn("[Firebase Auth] getUserByEmail failed:", error.message);
      return { ok: false, reason: error.message };
    }
  }

  try {
    await auth.createUser({
      email: normalizedEmail,
      password: String(password),
      emailVerified: true,
    });
    return { ok: true, created: true };
  } catch (error) {
    console.warn("[Firebase Auth] createUser failed:", error.message);
    return { ok: false, reason: error.message };
  }
}

/** Ensure Firebase Auth user exists so password-reset email can be sent. */
async function ensureFirebaseAuthUserForReset(email, fallbackPassword) {
  const auth = getAuth();
  if (!auth) return { ok: false, reason: "firebase_not_configured" };

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return { ok: false, reason: "invalid_email" };

  try {
    await auth.getUserByEmail(normalizedEmail);
    return { ok: true, existed: true };
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      return { ok: false, reason: error.message };
    }
  }

  const password =
    String(fallbackPassword || "").trim() ||
    crypto.randomBytes(24).toString("base64url");

  return ensureFirebaseAuthUser(normalizedEmail, password);
}

async function updateFirebaseAuthPassword(email, newPassword) {
  const auth = getAuth();
  if (!auth) return { ok: false, reason: "firebase_not_configured" };

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const password = String(newPassword || "");
  if (!normalizedEmail || !password) {
    return { ok: false, reason: "invalid_input" };
  }

  try {
    const record = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(record.uid, { password });
    return { ok: true, updated: true };
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      return ensureFirebaseAuthUser(normalizedEmail, password);
    }
    console.warn("[Firebase Auth] updatePassword failed:", error.message);
    return { ok: false, reason: error.message };
  }
}

/** Firebase Identity Toolkit — sends password reset email (no SMTP). */
async function sendFirebasePasswordResetEmail(email) {
  const apiKey = getWebApiKey();
  if (!apiKey) return { ok: false, reason: "firebase_web_api_key_missing" };
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_configured" };

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return { ok: false, reason: "invalid_email" };

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email: normalizedEmail,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.message || `Firebase sendOobCode failed (${res.status})`;
    console.warn("[Firebase Auth] sendPasswordResetEmail failed:", reason);
    if (isConfigurationNotFoundError(reason)) {
      return {
        ok: false,
        reason: "email_password_provider_disabled",
        hint: "Enable Email/Password in Firebase Console → Authentication → Sign-in method",
      };
    }
    if (String(reason).includes("EMAIL_NOT_FOUND")) {
      return { ok: false, reason: "firebase_user_not_found" };
    }
    return { ok: false, reason };
  }

  return { ok: true, channel: "server" };
}

/**
 * Ensure Firebase Auth user exists, then send reset email.
 * sendOobCode returns success even when no Firebase user exists (no mail is sent).
 */
async function requestFirebasePasswordReset(email, fallbackPassword) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const ensured = await ensureFirebaseAuthUserForReset(normalizedEmail, fallbackPassword);
  if (!ensured.ok) {
    if (isConfigurationNotFoundError(ensured.reason)) {
      return {
        ok: false,
        reason: "email_password_provider_disabled",
        hint: "Enable Email/Password in Firebase Console → Authentication → Sign-in method",
      };
    }
    return { ok: false, reason: ensured.reason || "firebase_user_setup_failed" };
  }

  const auth = getAuth();
  if (auth) {
    try {
      await auth.getUserByEmail(normalizedEmail);
    } catch {
      return { ok: false, reason: "firebase_user_not_found_after_ensure" };
    }
  }

  const sent = await sendFirebasePasswordResetEmail(normalizedEmail);
  if (!sent.ok) return sent;

  console.log(
    `[Firebase Auth] Password reset email requested for ${normalizedEmail}` +
      (ensured.created ? " (firebase user created)" : "")
  );

  return {
    ...sent,
    firebaseUserCreated: Boolean(ensured.created),
  };
}

/** Verify email/password against Firebase Auth (syncs after email reset link). */
async function signInWithFirebasePassword(email, password) {
  const apiKey = getWebApiKey();
  if (!apiKey) return { ok: false, reason: "firebase_web_api_key_missing" };

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const passwordStr = String(password || "");
  if (!normalizedEmail || !passwordStr) {
    return { ok: false, reason: "invalid_input" };
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        password: passwordStr,
        returnSecureToken: false,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, reason: data?.error?.message || "invalid_credentials" };
  }

  return { ok: true, localId: data?.localId };
}

module.exports = {
  getAuth,
  ensureFirebaseAuthUser,
  ensureFirebaseAuthUserForReset,
  updateFirebaseAuthPassword,
  sendFirebasePasswordResetEmail,
  requestFirebasePasswordReset,
  signInWithFirebasePassword,
  isPasswordResetConfigured,
  getPasswordResetStatus,
  probeFirebaseAuthConfiguration,
  isConfigurationNotFoundError,
};
