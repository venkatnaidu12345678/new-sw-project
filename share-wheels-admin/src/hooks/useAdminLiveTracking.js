import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectAdminSocket,
  disconnectAdminSocket,
  requestActiveRidesSnapshot,
} from "../services/adminSocket";

const rideKey = (id) => (id == null ? "" : String(id));

export const normalizeTrackingLocation = (loc) => {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, updatedAt: loc.updatedAt };
};

const normalizeRideRow = (row) => ({
  ...row,
  rideId: rideKey(row.rideId),
  location: normalizeTrackingLocation(row.location),
});

const normalizeRideList = (list) =>
  (Array.isArray(list) ? list : []).map(normalizeRideRow);

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
  const participants = mapSocketParticipants(payload.participantLocations);

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

  if (participants.length) {
    next.participants = participants;
  }

  next.isTracking = true;
  return next;
};

/**
 * Live admin tracking: one socket connection, snapshot on join, GPS via locationUpdate.
 * No polling interval — manual refresh uses requestActiveRides over the socket.
 */
export function useAdminLiveTracking() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const mountedRef = useRef(true);

  const applySnapshot = useCallback((body) => {
    const list = normalizeRideList(body?.rides);
    setRides(list);
    setError("");
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const body = await requestActiveRidesSnapshot();
      if (!mountedRef.current) return;
      applySnapshot(body);
    } catch (e) {
      if (mountedRef.current) setError(e.message || "Could not refresh rides");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applySnapshot]);

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

  return {
    rides,
    loading,
    error,
    socketConnected,
    refresh,
    setRides,
  };
}
