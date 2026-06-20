import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useParticipantLocation } from "../hooks/useDriverLocation";
import { getActiveRideTracking } from "../Utils/activeRideTracking";
import {
  getPublishingRideId,
  startLiveLocationPublishing,
} from "../liveTracking/liveLocationPublisher";
import { normalizeRideId } from "../liveTracking/liveTrackingState";

/**
 * Keeps sending GPS app-wide while a ride is active (driver, passenger, or courier).
 * Survives screen changes and app backgrounding.
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

  useEffect(() => {
    if (!rideId || !token) return undefined;

    const watchdog = setInterval(async () => {
      const active = await getActiveRideTracking();
      const activeId = normalizeRideId(active?.rideId);
      const currentId = normalizeRideId(rideId);
      if (!activeId || activeId !== currentId) return;
      if (getPublishingRideId() === currentId) return;
      await startLiveLocationPublishing({ rideId: currentId, token });
    }, 5000);

    return () => clearInterval(watchdog);
  }, [rideId, token]);

  return null;
};

export default DriverLocationTracker;
