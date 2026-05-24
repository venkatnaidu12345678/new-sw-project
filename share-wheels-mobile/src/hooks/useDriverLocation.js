import { useEffect, useRef } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { updateRideLocation } from "../ApiService/chatApiServices";

let Geolocation = null;
try {
  Geolocation = require("@react-native-community/geolocation").default;
} catch {
  Geolocation = null;
}

const requestLocationPermission = async () => {
  if (Platform.OS !== "android") return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

/**
 * Sends driver GPS to backend every 15s while ride is started.
 */
export const useDriverLocation = ({ enabled, rideId, token }) => {
  const watchId = useRef(null);

  useEffect(() => {
    if (!enabled || !rideId || !token || !Geolocation) return undefined;

    let intervalId;

    const pushLocation = () => {
      Geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await updateRideLocation(
              token,
              rideId,
              pos.coords.latitude,
              pos.coords.longitude
            );
          } catch (e) {
            console.log("Location update failed:", e.message);
          }
        },
        (err) => console.log("GPS error:", err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) return;
      pushLocation();
      intervalId = setInterval(pushLocation, 15000);
    })();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (watchId.current != null) Geolocation.clearWatch(watchId.current);
    };
  }, [enabled, rideId, token]);
};
