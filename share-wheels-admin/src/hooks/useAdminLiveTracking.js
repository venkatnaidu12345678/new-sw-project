import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveTracking } from "../api/client";
import {
  connectAdminSocket,
  disconnectAdminSocket,
  requestActiveRidesSnapshot,
} from "../services/adminSocket";

const TRACKING_POLL_MS = 3000;

const rideKey = (id) => (id == null ? "" : String(id));

export const normalizeTrackingLocation = (loc) => {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, updatedAt: loc.updatedAt };
};

const normalizeParticipantRow = (p) => {
  const loc = normalizeTrackingLocation(p?.location || p);
  return {
    ...p,
    userId: rideKey(p.userId),
    location: loc,
    ...(loc ? { lat: loc.lat, lng: loc.lng } : {}),
  };
};

const normalizeRideRow = (row) => ({
  ...row,
  rideId: rideKey(row.rideId),
  location: normalizeTrackingLocation(row.location),
  participants: (row.participants || []).map(normalizeParticipantRow),
});

const normalizeRideList = (list) =>
  (Array.isArray(list) ? list : []).map(normalizeRideRow);

const locationTimestamp = (loc) => {
  if (!loc?.updatedAt) return 0;
  const t = new Date(loc.updatedAt).getTime();
  return Number.isFinite(t) ? t : 0;
};

const pickNewerLocation = (left, right) => {
  if (!left && !right) return null;
  if (!left) return right;
  if (!right) return left;
  return locationTimestamp(right) >= locationTimestamp(left) ? right : left;
};

const mergeParticipants = (prev = [], next = []) => {
  const byKey = new Map();
  prev.forEach((p) => {
    const row = normalizeParticipantRow(p);
    byKey.set(`${row.userId}-${row.role}`, row);
  });
  next.forEach((p) => {
    const normalized = normalizeParticipantRow(p);
    const key = `${normalized.userId}-${normalized.role}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalized);
      return;
    }
    byKey.set(key, {
      ...existing,
      ...normalized,
      location: pickNewerLocation(existing.location, normalized.location),
    });
  });
  return Array.from(byKey.values());
};

/** Merge API poll into state without discarding fresher socket GPS. */
const mergeRideListFromPoll = (prev, incoming) => {
  const prevById = new Map(prev.map((r) => [rideKey(r.rideId), r]));
  const merged = incoming.map((row) => {
    const existing = prevById.get(rideKey(row.rideId));
    if (!existing) return row;
    return {
      ...existing,
      ...row,
      location: pickNewerLocation(existing.location, row.location),
      participants: mergeParticipants(existing.participants, row.participants),
      path:
        (row.path?.length || 0) >= (existing.path?.length || 0)
          ? row.path
          : existing.path,
    };
  });

  incoming.forEach((row) => prevById.delete(rideKey(row.rideId)));
  prevById.forEach((row) => merged.push(row));
  return merged;
};

const mapSocketParticipants = (rows = []) =>
  rows.map((p) => ({
    userId: p.userId?.toString?.() || String(p.userId),
    role: p.role,
    name: p.name,
    location: normalizeTrackingLocation(p.location || p),
  }));

const patchRideFromLocationUpdate = (row, payload) => {
  if (rideKey(row.rideId) !== rideKey(payload.rideId)) return row;

  const next = { ...row };
  const incoming = mapSocketParticipants(payload.participantLocations);

  if (payload.role === "driver" && payload.location) {
    next.location = normalizeTrackingLocation(payload.location);
  } else if (payload.driverLocation) {
    next.location = normalizeTrackingLocation(payload.driverLocation);
  }

  if (Array.isArray(payload.path) && payload.path.length) {
    next.path = payload.path
      .map((pt) => {
        const lat = Number(pt.lat);
        const lng = Number(pt.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      })
      .filter(Boolean);
  }

  if (incoming.length) {
    next.participants = mergeParticipants(row.participants || [], incoming);
  }

  next.isTracking = true;
  return next;
};

/**
 * Live admin tracking: WebSocket updates + GET /admin/tracking/active every 3s.
 */
export function useAdminLiveTracking() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const mountedRef = useRef(true);
  const pollInFlightRef = useRef(false);
  const ridesLengthRef = useRef(0);

  const applySnapshot = useCallback((body) => {
    const list = normalizeRideList(body?.rides);
    setRides(list);
    setError("");
  }, []);

  const refresh = useCallback(async () => {
    const showBlockingLoader = rides.length === 0;
    try {
      if (showBlockingLoader) setLoading(true);
      const body = await getActiveTracking();
      if (!mountedRef.current) return;
      applySnapshot(body);
    } catch (e) {
      try {
        const body = await requestActiveRidesSnapshot();
        if (!mountedRef.current) return;
        applySnapshot(body);
      } catch (socketErr) {
        if (mountedRef.current) {
          setError(socketErr.message || e.message || "Could not refresh rides");
        }
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applySnapshot, rides.length]);

  const pollTrackingApi = useCallback(async () => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const body = await getActiveTracking();
      if (!mountedRef.current) return;
      const list = normalizeRideList(body?.rides);
      setRides((prev) => mergeRideListFromPoll(prev, list));
      setError("");
      setLoading(false);
    } catch (e) {
      if (mountedRef.current && ridesLengthRef.current === 0) {
        setError(e.message || "Could not load live tracking");
        setLoading(false);
      }
    } finally {
      pollInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let socket = null;

    const onSnapshot = (body) => {
      if (!mountedRef.current) return;
      applySnapshot(body);
      setLoading(false);
      setError("");
    };

    const onLocationUpdate = (payload) => {
      if (!mountedRef.current || !payload?.rideId) return;
      setRides((prev) =>
        prev.map((row) => patchRideFromLocationUpdate(row, payload))
      );
    };

    const onRideStarted = (row) => {
      if (!mountedRef.current || !row?.rideId) return;
      const normalized = normalizeRideRow(row);
      setRides((prev) => {
        const id = rideKey(normalized.rideId);
        const idx = prev.findIndex((r) => rideKey(r.rideId) === id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...normalized };
          return next;
        }
        return [...prev, normalized];
      });
    };

    const onRideEnded = ({ rideId }) => {
      if (!mountedRef.current || !rideId) return;
      const id = rideKey(rideId);
      setRides((prev) => prev.filter((r) => rideKey(r.rideId) !== id));
    };

    const onDisconnect = () => {
      if (mountedRef.current) setSocketConnected(false);
    };

    const onConnect = () => {
      if (mountedRef.current) setSocketConnected(true);
    };

    connectAdminSocket()
      .then((s) => {
        socket = s;
        s.on("activeRidesSnapshot", onSnapshot);
        s.on("locationUpdate", onLocationUpdate);
        s.on("rideStarted", onRideStarted);
        s.on("rideEnded", onRideEnded);
        s.on("disconnect", onDisconnect);
        s.on("connect", onConnect);
        setSocketConnected(s.connected);
      })
      .catch((e) => {
        if (mountedRef.current) {
          setError(e.message || "Could not connect to live tracking");
          setLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
      if (socket) {
        socket.off("activeRidesSnapshot", onSnapshot);
        socket.off("locationUpdate", onLocationUpdate);
        socket.off("rideStarted", onRideStarted);
        socket.off("rideEnded", onRideEnded);
        socket.off("disconnect", onDisconnect);
        socket.off("connect", onConnect);
      }
      disconnectAdminSocket();
    };
  }, [applySnapshot]);

  useEffect(() => {
    ridesLengthRef.current = rides.length;
  }, [rides.length]);

  useEffect(() => {
    pollTrackingApi();
    const interval = setInterval(pollTrackingApi, TRACKING_POLL_MS);
    return () => clearInterval(interval);
  }, [pollTrackingApi]);

  return {
    rides,
    loading,
    error,
    socketConnected,
    refresh,
    setRides,
  };
}
