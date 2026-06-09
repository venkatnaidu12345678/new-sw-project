const admin = require("firebase-admin");
const { initializeFirebaseAdmin } = require("./firebaseAdmin");

function getAuth() {
  if (!initializeFirebaseAdmin()) return null;
  return admin.auth();
}

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

module.exports = {
  getAuth,
  ensureFirebaseAuthUser,
  updateFirebaseAuthPassword,
};
