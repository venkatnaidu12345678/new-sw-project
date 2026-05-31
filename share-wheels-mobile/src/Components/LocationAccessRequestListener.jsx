import { useEffect } from "react";
import { Alert } from "react-native";
import { subscribeSocketEvent } from "../services/appSocket";
import { requestLocationPermissionWhenDriverAsks } from "../Utils/locationPermissions";
import { setActiveRideTracking } from "../Utils/activeRideTracking";

/**
 * Listens for driver requests to share location during an active ride.
 * Only prompts when the user accepts — no automatic permission dialogs.
 */
const LocationAccessRequestListener = () => {
  useEffect(() => {
    let unsub = () => {};

    (async () => {
      unsub = await subscribeSocketEvent("locationAccessRequested", (payload) => {
        const rideId = payload?.rideId?.toString?.() || payload?.rideId;
        const driverName = payload?.driverName || "Driver";

        Alert.alert(
          "Location requested",
          `${driverName} asked you to share your location for this ride.`,
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Enable location",
              onPress: async () => {
                const ok = await requestLocationPermissionWhenDriverAsks(driverName);
                if (ok && rideId) {
                  await setActiveRideTracking(rideId);
                }
              },
            },
          ]
        );
      });
    })();

    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return null;
};

export default LocationAccessRequestListener;
