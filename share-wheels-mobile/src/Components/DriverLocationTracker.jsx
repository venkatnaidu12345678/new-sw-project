import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDriverLocation } from "../hooks/useDriverLocation";
import { getActiveRideTracking } from "../Utils/activeRideTracking";

/**
 * Keeps sending driver GPS app-wide while a ride is marked active in storage.
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
    const interval = setInterval(sync, 4000);
    return () => clearInterval(interval);
  }, []);

  useDriverLocation({
    enabled: !!rideId && !!token,
    rideId,
    token,
  });

  return null;
};

export default DriverLocationTracker;
