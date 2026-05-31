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

const LOCAL_GPS_THROTTLE_MS = 2000;

/** Cheap fingerprint to skip redundant React state updates. */
const trackingFingerprint = (tracking) => {
  const lt = tracking?.liveTracking;
  if (!lt) return "";
  const parts = [];
  const d = lt.driverLocation;
  if (d) {
    parts.push(
      `d:${Number(d.lat ?? d.latitude).toFixed(4)},${Number(d.lng ?? d.longitude).toFixed(4)}`
    );
  }
  (lt.participantLocations || []).forEach((p) => {
    const id = normalizeRideId(p.userId);
    const lat = Number(p.lat ?? p.latitude);
    const lng = Number(p.lng ?? p.longitude);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    parts.push(`${id}:${p.role}:${lat.toFixed(4)},${lng.toFixed(4)}`);
  });
  const hist = lt.locationHistory?.length || 0;
  return `${parts.sort().join("|")}|h:${hist}`;
};

/**
 * Live map state: socket-only updates after one-time bootstrap.
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
  const lastLocalGpsAt = useRef(0);
  const trackingFpRef = useRef("");

  useEffect(() => {
    if (tokenProp) setToken(tokenProp);
    else AsyncStorage.getItem("token").then(setToken);
  }, [tokenProp]);

  const setTrackingIfChanged = useCallback((updater) => {
    setTracking((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!next) return next;
      const fp = trackingFingerprint(next);
      if (fp && fp === trackingFpRef.current) return prev;
      trackingFpRef.current = fp;
      return next;
    });
  }, []);

  const applyBootstrap = useCallback(
    (apiBody) => {
      const normalized = normalizeTrackingApi(apiBody);
      if (!normalized) return;
      setTrackingIfChanged((prev) => {
        if (!prev) return normalized;
        return mergeSocketLocation(normalized, {
          rideId: rid,
          participantLocations: prev.liveTracking?.participantLocations || [],
          driverLocation: prev.liveTracking?.driverLocation,
        });
      });
      bootstrapped.current = true;
    },
    [rid, setTrackingIfChanged]
  );

  const bootstrapFromApi = useCallback(async () => {
    if (!token || !rid) return;
    try {
      const data = await getRideTracking(token, rid);
      applyBootstrap(data);
    } catch {
      /* socket updates will populate the map */
    }
  }, [token, rid, applyBootstrap]);

  const onSocketPayload = useCallback(
    (payload) => {
      if (normalizeRideId(payload?.rideId) !== rid) return;
      setSocketLive(true);
      setTrackingIfChanged((prev) => mergeSocketLocation(prev, payload));
    },
    [rid, setTrackingIfChanged]
  );

  useEffect(() => {
    if (!enabled || !rid || !token) {
      setSocketLive(false);
      return undefined;
    }

    let unsubLocation = () => {};
    let unsubReconnect = () => {};
    let cancelled = false;

    (async () => {
      try {
        const s = await connectAppSocket();
        if (cancelled) return;
        await joinRideRoom(rid);
        if (cancelled) return;

        unsubLocation = await subscribeSocketEvent("locationUpdate", onSocketPayload);

        if (!bootstrapped.current) {
          bootstrapFromApi();
        }

        if (s?.io) {
          const onReconnect = () => {
            if (cancelled) return;
            bootstrapFromApi();
          };
          s.io.on("reconnect", onReconnect);
          unsubReconnect = () => s.io.off("reconnect", onReconnect);
        }
      } catch (e) {
        if (__DEV__) console.warn("[live-map] connect:", e?.message);
      }
    })();

    return () => {
      cancelled = true;
      try {
        unsubLocation();
        unsubReconnect();
      } catch {
        /* ignore */
      }
      setSocketLive(false);
      bootstrapped.current = false;
      trackingFpRef.current = "";
    };
  }, [enabled, rid, token, onSocketPayload, bootstrapFromApi]);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    hasLocationPermission().then((ok) => {
      if (active) setPermission(ok);
    });
    const unsub = subscribeGpsUpdates((coords) => {
      if (!active || !coords) return;
      const now = Date.now();
      if (now - lastLocalGpsAt.current < LOCAL_GPS_THROTTLE_MS) return;
      lastLocalGpsAt.current = now;
      setLocalGps(true);
      setTrackingIfChanged((prev) =>
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
  }, [enabled, myUserId, myRole, myName, setTrackingIfChanged]);

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
