import { Alert, Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "@react-native-community/geolocation";

const LOCATION_GRANTED_KEY = "@sw_location_granted";

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

/** Check permission only — never shows dialogs. */
export const hasLocationPermission = async () => {
  if (Platform.OS === "ios") {
    const stored = await AsyncStorage.getItem(LOCATION_GRANTED_KEY);
    return stored === "true";
  }
  if (Platform.OS !== "android") return true;
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
  if (await hasLocationPermission()) {
    await persistGrantState(true);
    return true;
  }
  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  if (fine === PermissionsAndroid.RESULTS.GRANTED) {
    await persistGrantState(true);
    return true;
  }
  const coarse = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
  );
  const granted = coarse === PermissionsAndroid.RESULTS.GRANTED;
  await persistGrantState(granted);
  return granted;
};

const requestSystemPermission = async () => {
  if (Platform.OS === "ios") return requestIosAuthorization();
  if (Platform.OS === "android") return requestAndroidPermissions();
  return true;
};

/**
 * Shown once after sign-in — optional for passengers; enables live ride maps later.
 */
export const requestLocationPermissionOnLogin = async () => {
  if (await hasLocationPermission()) return true;

  const proceed = await showAlert(
    "Enable location for rides",
    "Share Wheels uses your location during active rides for live tracking and safety. You can change this anytime in Settings.",
    [
      { text: "Not now", style: "cancel", onPress: () => false },
      { text: "Continue", onPress: () => true },
    ]
  );
  if (!proceed) {
    await persistGrantState(false);
    return false;
  }
  return requestSystemPermission();
};

/**
 * Required before a driver can start a ride — only prompts if not already granted.
 */
export const requestLocationPermissionForDriverStart = async () => {
  if (await hasLocationPermission()) return true;

  const proceed = await showAlert(
    "Location required to start ride",
    "As the driver, you must allow location access so passengers and couriers can track the trip live.",
    [
      { text: "Cancel", style: "cancel", onPress: () => false },
      { text: "Allow location", onPress: () => true },
    ]
  );
  if (!proceed) return false;
  return requestSystemPermission();
};

/**
 * When a driver asks the passenger/courier to share location during an active ride.
 */
export const requestLocationPermissionWhenDriverAsks = async (driverName) => {
  if (await hasLocationPermission()) return true;

  const who = driverName?.trim() || "Your driver";
  const proceed = await showAlert(
    "Share your location?",
    `${who} requested your location for this ride so they can see you on the live map.`,
    [
      { text: "Not now", style: "cancel", onPress: () => false },
      { text: "Enable location", onPress: () => true },
    ]
  );
  if (!proceed) return false;
  return requestSystemPermission();
};
