import { Platform, PermissionsAndroid } from "react-native";

/** Android requires runtime CAMERA when declared in the manifest. */
export const requestCameraPermission = async () => {
  if (Platform.OS !== "android") return true;

  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    if (alreadyGranted) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};
