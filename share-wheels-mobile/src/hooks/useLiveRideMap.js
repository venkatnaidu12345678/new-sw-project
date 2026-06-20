import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  connectAppSocket,
  joinRideRoom,
  leaveRideRoom,
  subscribeSocketEvent,
  requestRideTrackingSnapshot,
} from "../services/appSocket";
import {
  normalizeRideId,
  normalizeTrackingApi,
  mergeTrackingFromPoll,
  applyLocalGps,
  countOnMap,
  filterTrackingForViewer,
} from "../liveTracking/liveTrackingState";
import { getRideTracking } from "../ApiService/chatApiServices";
import { subscribeGpsUpdates, subscribeLocationWatch } from "../Utils/gpsService";
import { hasLocationPermission } from "../Utils/locationPermissions";
import { getPublishingRideId } from "../liveTracking/liveLocationPublisher";

const LOCAL_GPS_THROTTLE_MS = 500;
const TRACKING_POLL_MS = 3000;

const coordKey = (n) => Number(n).toFixed(6);

/** Cheap fingerprint to skip redundant React state updates. */
const trackingFingerprint = (tracking) => {
  const lt = tracking?.liveTracking;
  if (!lt) return "";
  const parts = [];
  const d = lt.driverLocation;
  if (d) {
    parts.push(
      `d:${coordKey(d.lat ?? d.latitude)},${coordKey(d.lng ?? d.longitude)}`
    );
  }
  (lt.participantLocations || []).forEach((p) => {
    const id = normalizeRideId(p.userId);
    const lat = Number(p.lat ?? p.latitude);
    const lng = Number(p.lng ?? p.longitude);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    parts.push(`${id}:${p.role}:${coordKey(lat)},${coordKey(lng)}`);
  });
  const hist = lt.locationHistory?.length || 0;
  const lastHist = lt.locationHistory?.[hist - 1];
  const histTail = lastHist
    ? `${coordKey(lastHist.lat ?? lastHist.latitude)},${coordKey(lastHist.lng ?? lastHist.longitude)}`
    : "";
  const routeKey = String(tracking?.routePolyline || "").length;
  const stopKey = (tracking?.stopovers || []).length;
  return `${parts.sort().join("|")}|h:${hist}|t:${histTail}|rp:${routeKey}|st:${stopKey}|f:${tracking?.from || ""}|t:${tracking?.to || ""}`;
};

/**
 * Live map state: socket updates + GET /tracking poll every 3s + local GPS.
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
  const [snapshotReceived, setSnapshotReceived] = useState(false);
  const [token, setToken] = useState(tokenProp || null);
  const [socketLive, setSocketLive] = useState(false);
  const [permission, setPermission] = useState(false);
  const [localGps, setLocalGps] = useState(false);
  const lastLocalGpsAt = useRef(0);
  const trackingFpRef = useRef("");
  const snapshotReceivedRef = useRef(false);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    if (tokenProp) setToken(tokenProp);
    else AsyncStorage.getItem("token").then(setToken);
  }, [tokenProp]);

  useEffect(() => {
    setSnapshotReceived(false);
    snapshotReceivedRef.current = false;
    setTracking(null);
    trackingFpRef.current = "";
  }, [rid]);

  useEffect(() => {
    if (!enabled) {
      setSnapshotReceived(false);
      snapshotReceivedRef.current = false;
      setTracking(null);
      trackingFpRef.current = "";
    }
  }, [enabled]);

  const withViewerFilter = useCallback(
    (next) => {
      if (!next) return next;
      return filterTrackingForViewer(
        { ...next, myUserId: next.myUserId || myUserId },
        myRole,
        myUserId
      );
    },
    [myRole, myUserId]
  );

  const setTrackingIfChanged = useCallback(
    (updater) => {
      setTracking((prev) => {
        const raw =
          typeof updater === "function" ? updater(prev) : updater;
        const next = withViewerFilter(raw);
        if (!next) return next;
        const fp = trackingFingerprint(next);
        if (fp && fp === trackingFpRef.current) return prev;
        trackingFpRef.current = fp;
        return next;
      });
    },
    [withViewerFilter]
  );

  const applySnapshot = useCallback(
    (snapshot, { fromPoll = false } = {}) => {
      if (!snapshot) return;
      const snapRideId = normalizeRideId(snapshot.rideId) || rid;
      if (snapRideId !== rid) return;

      snapshotReceivedRef.current = true;
      setSnapshotReceived(true);
      if (!fromPoll) setSocketLive(true);

      setTrackingIfChanged((prev) => {
        const payload = { ...snapshot, rideId: rid };
        if (fromPoll || prev) {
          return mergeTrackingFromPoll(prev, payload);
        }
        return normalizeTrackingApi(payload);
      });
    },
    [rid, setTrackingIfChanged]
  );

  const requestSnapshot = useCallback(async () => {
    if (!rid || !token) return;
    const body = await requestRideTrackingSnapshot(rid);
    if (body) applySnapshot(body);
  }, [rid, token, applySnapshot]);

  const pollTrackingApi = useCallback(async () => {
    if (!rid || !token || pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const body = await getRideTracking(token, rid);
      if (body && body.success !== false) {
        applySnapshot({ ...body, rideId: rid }, { fromPoll: true });
      }
    } catch (e) {
      if (__DEV__) console.warn("[live-map] poll:", e?.message);
    } finally {
      pollInFlightRef.current = false;
    }
  }, [rid, token, applySnapshot]);

  const onSocketPayload = useCallback(
    (payload) => {
      if (normalizeRideId(payload?.rideId) !== rid) return;
      setSocketLive(true);
      setTrackingIfChanged((prev) =>
        mergeTrackingFromPoll(prev, { ...payload, rideId: rid })
      );
    },
    [rid, setTrackingIfChanged]
  );

  useEffect(() => {
    if (!enabled || !rid || !token) {
      setSocketLive(false);
      return undefined;
    }

    let unsubLocation = () => {};
    let unsubSnapshot = () => {};
    let unsubReconnect = () => {};
    let cancelled = false;
    const cleanups = [];

    (async () => {
      try {
        const s = await connectAppSocket();
        if (cancelled) return;
        await joinRideRoom(rid);
        if (cancelled) return;

        unsubLocation = await subscribeSocketEvent("locationUpdate", onSocketPayload);
        unsubSnapshot = await subscribeSocketEvent(
          "rideTrackingSnapshot",
          applySnapshot
        );

        await requestSnapshot();

        if (!cancelled && !snapshotReceivedRef.current) {
          snapshotReceivedRef.current = true;
          setSnapshotReceived(true);
          setTrackingIfChanged(
            (prev) =>
              prev ||
              normalizeTrackingApi({
                success: true,
                rideId: rid,
                liveTracking: { participantLocations: [] },
              })
          );
        }

        const unsubRoster = await subscribeSocketEvent(
          "rideParticipantsUpdated",
          (payload) => {
            if (normalizeRideId(payload?.rideId) !== rid) return;
            requestSnapshot();
          }
        );
        cleanups.push(unsubRoster);

        if (s?.io) {
          const onReconnect = () => {
            if (cancelled) return;
            joinRideRoom(rid).then(() => requestSnapshot());
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
        unsubSnapshot();
        unsubReconnect();
        cleanups.forEach((fn) => {
          try {
            fn();
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
      if (getPublishingRideId() !== rid) {
        leaveRideRoom(rid);
      }
      setSocketLive(false);
      trackingFpRef.current = "";
      snapshotReceivedRef.current = false;
    };
  }, [
    enabled,
    rid,
    token,
    onSocketPayload,
    applySnapshot,
    requestSnapshot,
  ]);

  useEffect(() => {
    if (!enabled || !rid || !token) return undefined;

    pollTrackingApi();
    const interval = setInterval(pollTrackingApi, TRACKING_POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, rid, token, pollTrackingApi]);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    let unsubCache = () => {};
    let unsubWatch = () => {};

    const applyCoords = (coords) => {
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
    };

    hasLocationPermission().then((ok) => {
      if (!active) return;
      setPermission(ok);
      if (!ok) return;
      unsubCache = subscribeGpsUpdates(applyCoords);
      unsubWatch = subscribeLocationWatch(applyCoords);
    });

    return () => {
      active = false;
      unsubCache();
      unsubWatch();
    };
  }, [enabled, myUserId, myRole, myName, setTrackingIfChanged]);

  const counts = useMemo(
    () => countOnMap(tracking, myRole),
    [tracking, myRole]
  );

  const statusHint = useMemo(() => {
    if (!enabled) return null;
    const role = (myRole || "").toString().toLowerCase();
    const isDriverView = role === "driver";
    const isPassengerOrCourier = role === "passenger" || role === "courier";

    if (!permission) {
      return isDriverView
        ? "Allow location for navigation arrow and participant tracking"
        : "Allow location to appear on the map";
    }
    if (isPassengerOrCourier && counts.driver === 0) {
      return localGps
        ? "You are on the map · waiting for driver GPS…"
        : "Waiting for driver location…";
    }
    if (isDriverView && counts.total === 0 && localGps) {
      return "Your GPS arrow is on the map · waiting for passengers…";
    }
    if (counts.total === 0 && localGps) {
      return "You are on the map · waiting for others…";
    }
    if (counts.total === 0) return "Waiting for GPS signals…";
    const parts = [];
    if (counts.driver) parts.push("Driver");
    if (counts.passengers)
      parts.push(`${counts.passengers} passenger${counts.passengers > 1 ? "s" : ""}`);
    if (counts.couriers)
      parts.push(`${counts.couriers} courier${counts.couriers > 1 ? "s" : ""}`);
    const live = socketLive ? " · live" : " · updating";
    return `${parts.join(", ")} on map${live}`;
  }, [enabled, permission, counts, localGps, socketLive, myRole]);

  return {
    tracking,
    loading: enabled && !!token && !snapshotReceived,
    ready: enabled && snapshotReceived,
    permission,
    localGps,
    socketLive,
    statusHint,
    counts,
  };
}
