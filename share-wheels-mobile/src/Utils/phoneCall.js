import { Alert, Linking, Platform } from "react-native";

/**
 * Opens the device phone dialer for a normal cellular call.
 */
export const openPhoneCall = (phone, label = "contact") => {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  if (!digits) {
    Alert.alert("No phone number", `This ${label} has no phone number on file.`);
    return;
  }
  const url = Platform.select({
    ios: `telprompt:${digits}`,
    default: `tel:${digits}`,
  });
  Linking.canOpenURL(url)
    .then((supported) => {
      if (!supported) {
        Alert.alert("Cannot call", "Phone calls are not supported on this device.");
        return;
      }
      return Linking.openURL(url);
    })
    .catch(() => Alert.alert("Error", "Could not open the phone dialer."));
};
