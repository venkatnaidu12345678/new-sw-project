import { Platform } from "react-native";
import crashlytics from "@react-native-firebase/crashlytics";

let initialized = false;

const crashlyticsInstance = () => crashlytics();

export async function initCrashlytics() {
  if (initialized) return;
  initialized = true;

  try {
    await crashlyticsInstance().setCrashlyticsCollectionEnabled(!__DEV__);

    if (__DEV__) return;

    const defaultHandler = global.ErrorUtils?.getGlobalHandler?.();
    if (defaultHandler) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        recordCrash(error, { isFatal }).finally(() => {
          defaultHandler(error, isFatal);
        });
      });
    }

    await crashlyticsInstance().setAttribute("platform", Platform.OS);
    await crashlyticsInstance().log("Crashlytics initialized");
  } catch (err) {
    console.warn("[crashlytics] init failed:", err?.message || err);
  }
}

export async function recordCrash(error, { isFatal = false } = {}) {
  if (__DEV__) return;
  try {
    const err =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : "Unknown JS error");

    await crashlyticsInstance().setAttribute("is_fatal", String(isFatal));
    await crashlyticsInstance().recordError(err);
  } catch (err) {
    console.warn("[crashlytics] record failed:", err?.message || err);
  }
}

/** Log a non-fatal error with optional context (API failures, caught exceptions). */
export async function reportError(error, context = {}) {
  if (__DEV__) return;
  try {
    const err =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : "Unknown error");

    for (const [key, value] of Object.entries(context)) {
      if (value == null || value === "") continue;
      await crashlyticsInstance().setAttribute(
        String(key).slice(0, 40),
        String(value).slice(0, 100)
      );
    }

    const scope = context.scope || "app";
    await crashlyticsInstance().log(`reportError [${scope}]: ${err.message}`.slice(0, 1024));
    await crashlyticsInstance().recordError(err);
  } catch (err) {
    console.warn("[crashlytics] report failed:", err?.message || err);
  }
}

export async function logCrashlytics(message) {
  if (__DEV__) return;
  try {
    await crashlyticsInstance().log(String(message));
  } catch {
    // non-fatal
  }
}

export async function syncCrashlyticsUser(profile) {
  if (__DEV__) return;
  try {
    const id = profile?._id || profile?.id || profile?.userId;
    if (id) {
      await crashlyticsInstance().setUserId(String(id));
    }
    if (profile?.email) {
      await crashlyticsInstance().setAttribute("user_email", String(profile.email));
    }
    if (profile?.name || profile?.fullName) {
      await crashlyticsInstance().setAttribute(
        "user_name",
        String(profile.name || profile.fullName)
      );
    }
  } catch (err) {
    console.warn("[crashlytics] user sync failed:", err?.message || err);
  }
}

export async function clearCrashlyticsUser() {
  if (__DEV__) return;
  try {
    await crashlyticsInstance().setUserId("");
    await crashlyticsInstance().setAttribute("user_email", "");
    await crashlyticsInstance().setAttribute("user_name", "");
  } catch {
    // non-fatal
  }
}
