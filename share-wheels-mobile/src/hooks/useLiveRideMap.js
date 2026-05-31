import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRideTracking } from "../ApiService/chatApiServices";
import {
  connectAppSocket,
  joinRideRoom,
  subscribeSocketEvent,
} from "../services/appSocket";
import {
  normalizeRideId,
  normalizeTrackingApi,
  mergeSocketLocation,
  applyLocalGps,
  countOnMap,
} from "../liveTracking/liveTrackingState";
import { subscribeGpsUpdates } from "../Utils/gpsService";
import { hasLocationPermission } from "../Utils/locationPermissions";
import { apiRequest } from "../Utils/apiRequest";
import { baseUrl } from "../Config";

const BOOTSTRAP_TIMEOUT_MS = 6000;
const BACKUP_POLL_MS = 20000;

async function fetchTrackingFast(token, rideId) {
  const id = normalizeRideId(rideId);
  return apiRequest(`${baseUrl}/rides/${id}/chat/tracking`, {
    token,
    method: "GET",
    timeoutMs: BOOTSTRAP_TIMEOUT_MS,
  });
}

/**
 * Live map state: socket-first updates, fast bootstrap, local GPS shown instantly.
 */
export function useLiveRideMap({
  rideId,
  token: tokenProp,
  enabled,
  myRole,
  myUserId,
  myName,
}) {
  const rid = normalizeRideId(rideId);
  const [tracking, setTracking] = useState(null);
  const [token, setToken] = useState(tokenProp || null);
  const [socketLive, setSocketLive] = useState(false);
  const [permission, setPermission] = useState(false);
  const [localGps, setLocalGps] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (tokenProp) setToken(tokenProp);
    else AsyncStorage.getItem("token").then(setToken);
  }, [tokenProp]);

  const applyBootstrap = useCallback((apiBody) => {
    const normalized = normalizeTrackingApi(apiBody);
    if (!normalized) return;
    setTracking((prev) => {
      if (!prev) return normalized;
      return mergeSocketLocation(normalized, {
        rideId: rid,
        participantLocations: prev.liveTracking?.participantLocations || [],
        driverLocation: prev.liveTracking?.driverLocation,
      });
    });
    bootstrapped.current = true;
  }, [rid]);

  const onSocketPayload = useCallback(
    (payload) => {
      if (normalizeRideId(payload?.rideId) !== rid) return;
      setSocketLive(true);
      setTracking((prev) => mergeSocketLocation(prev, payload));
    },
    [rid]
  );

  useEffect(() => {
    if (!enabled || !rid || !token) {
      setSocketLive(false);
      return undefined;
    }

    let unsubLocation = () => {};
    let pollId;
    let cancelled = false;

    (async () => {
      try {
        await connectAppSocket();
        if (cancelled) return;
        await joinRideRoom(rid);
        if (cancelled) return;

        unsubLocation = await subscribeSocketEvent(
          "locationUpdate",
          onSocketPayload
        );

        if (!bootstrapped.current) {
          fetchTrackingFast(token, rid)
            .then(applyBootstrap)
            .catch(() => {
              getRideTracking(token, rid)
                .then(applyBootstrap)
                .catch(() => {});
            });
        }

        pollId = setInterval(() => {
          fetchTrackingFast(token, rid)
            .then(applyBootstrap)
            .catch(() => {});
        }, BACKUP_POLL_MS);
      } catch (e) {
        if (__DEV__) console.warn("[live-map] connect:", e?.message);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      try {
        unsubLocation();
      } catch {
        /* ignore */
      }
      setSocketLive(false);
    };
  }, [enabled, rid, token, onSocketPayload, applyBootstrap]);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    hasLocationPermission().then((ok) => {
      if (active) setPermission(ok);
    });
    const unsub = subscribeGpsUpdates((coords) => {
      if (!active || !coords) return;
      setLocalGps(true);
      setTracking((prev) =>
        applyLocalGps(prev, {
          userId: myUserId,
          role: myRole,
          name: myName,
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
      );
    });
    return () => {
      active = false;
      unsub();
    };
  }, [enabled, myUserId, myRole, myName]);

  const counts = useMemo(() => countOnMap(tracking), [tracking]);

  const statusHint = useMemo(() => {
    if (!enabled) return null;
    if (!permission) return "Allow location to appear on the map";
    if (counts.total === 0 && localGps) return "You are on the map · waiting for others…";
    if (counts.total === 0) return "Waiting for GPS signals…";
    const parts = [];
    if (counts.driver) parts.push("Driver");
    if (counts.passengers)
      parts.push(`${counts.passengers} passenger${counts.passengers > 1 ? "s" : ""}`);
    if (counts.couriers)
      parts.push(`${counts.couriers} courier${counts.couriers > 1 ? "s" : ""}`);
    const live = socketLive ? " · live" : "";
    return `${parts.join(", ")} on map${live}`;
  }, [enabled, permission, counts, localGps, socketLive]);

  return {
    tracking,
    ready: enabled && (!!tracking || localGps),
    permission,
    localGps,
    socketLive,
    statusHint,
    counts,
  };
}
