import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  sendPasswordResetEmail,
} from "@react-native-firebase/auth";

/**
 * Send Firebase password reset email from the app (uses google-services.json).
 */
export async function sendFirebasePasswordResetEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("Email is required");
  }

  const auth = getAuth(getApp());
  await sendPasswordResetEmail(auth, normalized);
}
