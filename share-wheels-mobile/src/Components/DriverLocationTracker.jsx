import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useParticipantLocation } from "../hooks/useDriverLocation";
import { getActiveRideTracking } from "../Utils/activeRideTracking";

/**
 * Keeps sending GPS app-wide while a ride is active (driver, passenger, or courier).
 */
const DriverLocationTracker = () => {
  const [rideId, setRideId] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const sync = async () => {
      const t = await AsyncStorage.getItem("token");
      const active = await getActiveRideTracking();
      setToken(t);
      setRideId(active?.rideId || null);
    };

    sync();
    const interval = setInterval(sync, 2000);
    return () => clearInterval(interval);
  }, []);

  useParticipantLocation({
    enabled: !!rideId && !!token,
    rideId,
    token,
  });

  return null;
};

export default DriverLocationTracker;
