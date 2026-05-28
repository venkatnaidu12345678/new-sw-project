import { useState, useEffect, useCallback } from "react";
import { getRideTracking } from "../ApiService/chatApiServices";
import {
  connectRideSocket,
  joinRideRoom,
  leaveRideRoom,
  releaseRideSocket,
  subscribeLocationUpdates,
} from "../services/rideSocket";
import { mergeTrackingFromSocket, normalizeRideId } from "../Utils/trackingMerge";

const extractRideId = (payload) =>
  payload?.rideId ||
  payload?.rideID ||
  payload?.ride?._id ||
  payload?.ride?.id ||
  payload?.ride;

/**
 * Live ride map data: initial HTTP load + real-time socket `locationUpdate`.
 * Works for driver, passenger, and courier (all roles on the ride room).
 */
export const useRideTracking = ({ rideId, token, enabled }) => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const rid = normalizeRideId(rideId);

  const loadTracking = useCallback(async () => {
    if (!token || !rid) return;
    try {
      const res = await getRideTracking(token, rid);
      setTracking(res);
    } catch (e) {
      if (__DEV__) console.warn("[tracking] load:", e.message);
    } finally {
      setLoading(false);
    }
  }, [token, rid]);

  useEffect(() => {
    if (!token || !rid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadTracking();
  }, [token, rid, loadTracking]);

  useEffect(() => {
    if (!enabled || !token || !rid) return undefined;

    let unsub = () => {};

    (async () => {
      try {
        await connectRideSocket(token);
        joinRideRoom(rid);
        unsub = subscribeLocationUpdates((payload) => {
          if (normalizeRideId(extractRideId(payload)) !== rid) return;
          setTracking((prev) => mergeTrackingFromSocket(prev, payload));
        });
      } catch (e) {
        console.warn("[tracking] socket:", e.message);
      }
    })();

    return () => {
      unsub();
      leaveRideRoom(rid);
      releaseRideSocket();
    };
  }, [enabled, token, rid]);

  return { tracking, loading, refresh: loadTracking };
};
