import { Alert, Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "@react-native-community/geolocation";
import { hasNotificationPermission, requestUserPermission } from "../Notifications/FCMService";

const LOCATION_GRANTED_KEY = "@sw_location_granted";
const PERMISSIONS_ONBOARDING_KEY = "@sw_permissions_onboarding_done";

const showAlert = (title, message, buttons) =>
  new Promise((resolve) => {
    Alert.alert(title, message, buttons, {
      cancelable: true,
      onDismiss: () => resolve(false),
    });
  });

const persistGrantState = async (granted) => {
  await AsyncStorage.setItem(LOCATION_GRANTED_KEY, granted ? "true" : "false");
};

export const markLocationGranted = () => persistGrantState(true);
export const markLocationDenied = () => persistGrantState(false);

const probeIosLocationGranted = () =>
  new Promise((resolve) => {
    if (Platform.OS !== "ios" || !Geolocation?.getCurrentPosition) {
      resolve(false);
      return;
    }
    Geolocation.getCurrentPosition(
      () => resolve(true),
      (err) => resolve(err?.code !== 1),
      { enableHighAccuracy: false, timeout: 2000, maximumAge: 600000 }
    );
  });

/** Check permission only — never shows dialogs. */
export const hasLocationPermission = async () => {
  if (Platform.OS === "android") {
    try {
      const fine = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (fine) {
        await persistGrantState(true);
        return true;
      }
      const coarse = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );
      if (coarse) await persistGrantState(true);
      return coarse;
    } catch {
      return false;
    }
  }

  if (Platform.OS === "ios") {
    const stored = await AsyncStorage.getItem(LOCATION_GRANTED_KEY);
    if (stored === "true") return true;
    const probed = await probeIosLocationGranted();
    if (probed) await persistGrantState(true);
    return probed;
  }

  return true;
};

const requestIosAuthorization = async () => {
  try {
    const status = await Geolocation.requestAuthorization("whenInUse");
    const granted = status === "granted";
    await persistGrantState(granted);
    return granted;
  } catch {
    await persistGrantState(false);
    return false;
  }
};

const requestAndroidPermissions = async () => {
  if (await hasLocationPermission()) return true;

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  if (fine === PermissionsAndroid.RESULTS.GRANTED) {
    await persistGrantState(true);
    return true;
  }
  if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    await persistGrantState(false);
    return false;
  }

  const coarse = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
  );
  const granted = coarse === PermissionsAndroid.RESULTS.GRANTED;
  await persistGrantState(granted);
  return granted;
};

/** System location dialog only — no app Alert beforehand. */
export const requestSystemLocationPermission = async () => {
  if (await hasLocationPermission()) return true;
  if (Platform.OS === "ios") return requestIosAuthorization();
  if (Platform.OS === "android") return requestAndroidPermissions();
  return true;
};

/**
 * Once after sign-in: one explanation, then notification + location system prompts.
 */
export const requestAppPermissionsOnSignIn = async () => {
  const onboardingDone = await AsyncStorage.getItem(PERMISSIONS_ONBOARDING_KEY);
  const locationOk = await hasLocationPermission();
  const notificationsOk = await hasNotificationPermission();

  if (onboardingDone === "true" && locationOk && notificationsOk) {
    return { location: true, notifications: true };
  }

  if (onboardingDone !== "true") {
    await AsyncStorage.setItem(PERMISSIONS_ONBOARDING_KEY, "true");

    if (Platform.OS !== "android") {
      const proceed = await showAlert(
        "Notifications & location",
        "Share Wheels sends ride alerts and uses your location during active rides for live maps and safety. You can change these anytime in Settings.",
        [
          { text: "Not now", style: "cancel", onPress: () => false },
          { text: "Continue", onPress: () => true },
        ]
      );
      if (!proceed) {
        return { location: locationOk, notifications: notificationsOk };
      }
    }
  }

  let notifications = notificationsOk;
  if (!notificationsOk) {
    notifications = await requestUserPermission();
  }

  let location = locationOk;
  if (!locationOk) {
    location = await requestSystemLocationPermission();
  }

  return { location, notifications };
};

/** @deprecated Use requestAppPermissionsOnSignIn */
export const requestLocationPermissionOnLogin = async () => {
  const r = await requestAppPermissionsOnSignIn();
  return r.location;
};
