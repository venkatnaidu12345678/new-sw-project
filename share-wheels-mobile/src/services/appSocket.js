import { AppState } from "react-native";
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseUrl } from "../Config";

let socket = null;
let connectPromise = null;
/** Keeps socket alive while user is signed in (AuthNavigator). */
let sessionRetainCount = 0;
const listeners = new Map();
/** rideId -> subscriber count */
const rideRoomRefs = new Map();
/** enrouteKey -> { count, payload } */
const enrouteRooms = new Map();

const getSocketUrl = () => baseUrl.replace(/\/$/, "");

let appStateHookInstalled = false;

const ensureAppStateReconnect = () => {
  if (appStateHookInstalled) return;
  appStateHookInstalled = true;
  AppState.addEventListener("change", (state) => {
    if (state === "active" || state === "background") {
      if (socket && !socket.connected) {
        connectAppSocket().catch(() => {});
      } else if (socket?.connected === false && socket?.active === false) {
        try {
          socket.connect();
        } catch {
          connectAppSocket().catch(() => {});
        }
      }
    }
  });
};

const rejoinAllRooms = () => {
  if (!socket?.connected) return;

  rideRoomRefs.forEach((count, id) => {
    if (count > 0) socket.emit("joinRide", id);
  });

  enrouteRooms.forEach(({ count, payload }) => {
    if (count > 0 && payload?.from && payload?.to) {
      socket.emit("joinEnroute", payload);
    }
  });
};

const attachPersistentHandlers = (s) => {
  if (s.__swHandlersAttached) return;
  s.__swHandlersAttached = true;

  s.on("connect", async () => {
    const t = await AsyncStorage.getItem("token");
    if (t) s.auth = { token: t };
    rejoinAllRooms();
    if (__DEV__) console.log("[socket] connected", s.id);
  });

  s.on("disconnect", (reason) => {
    if (__DEV__) console.log("[socket] disconnected", reason);
  });

  s.on("connect_error", (err) => {
    if (__DEV__) console.warn("[socket] connect_error", err?.message);
  });

  s.io?.on("reconnect", async () => {
    const t = await AsyncStorage.getItem("token");
    if (t) s.auth = { token: t };
    rejoinAllRooms();
    if (__DEV__) console.log("[socket] reconnected");
  });
};

const createSocket = (token) => {
  const s = io(getSocketUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 25000,
    autoConnect: true,
  });
  attachPersistentHandlers(s);
  return s;
};

export async function connectAppSocket() {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;

  ensureAppStateReconnect();

  if (socket?.connected) return socket;

  if (connectPromise) return connectPromise;

  connectPromise = new Promise((resolve) => {
    if (!socket) {
      socket = createSocket(token);
    } else {
      socket.auth = { token };
    }

    const finish = (s) => {
      connectPromise = null;
      resolve(s);
    };

    if (socket.connected) {
      finish(socket);
      return;
    }

    const onConnect = () => {
      socket.off("connect", onConnect);
      finish(socket);
    };

    socket.on("connect", onConnect);
    if (!socket.active) {
      socket.connect();
    }
  });

  return connectPromise;
}

/**
 * Call while authenticated so navigation / screen unmount does not tear down the socket.
 */
export function retainAppSocketSession() {
  sessionRetainCount += 1;
  connectAppSocket().catch(() => {});
}

export function releaseAppSocketSession() {
  sessionRetainCount = Math.max(0, sessionRetainCount - 1);
}

/**
 * Full teardown — logout only.
 */
export function disconnectAppSocket() {
  connectPromise = null;
  sessionRetainCount = 0;
  rideRoomRefs.clear();
  enrouteRooms.clear();
  if (socket) {
    socket.__swHandlersAttached = false;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}

const bumpRef = (map, key) => {
  map.set(key, (map.get(key) || 0) + 1);
};

const dropRef = (map, key) => {
  const next = (map.get(key) || 1) - 1;
  if (next <= 0) {
    map.delete(key);
    return true;
  }
  map.set(key, next);
  return false;
};

export async function joinRideRoom(rideId) {
  const id = rideId?.toString?.() || rideId;
  if (!id) return null;
  bumpRef(rideRoomRefs, id);
  const s = await connectAppSocket();
  if (s?.connected) s.emit("joinRide", id);
  return s;
}

export function leaveRideRoom(rideId) {
  const id = rideId?.toString?.() || rideId;
  if (!id || !socket) return;
  if (dropRef(rideRoomRefs, id)) {
    socket.emit("leaveRide", id);
  }
}

/** Socket snapshot for live map (replaces HTTP tracking bootstrap). */
export async function requestRideTrackingSnapshot(rideId) {
  const id = rideId?.toString?.() || rideId;
  if (!id) return null;
  const s = await connectAppSocket();
  if (!s?.connected) return null;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 10000);
    s.emit("requestRideTracking", id, (body) => {
      clearTimeout(timer);
      resolve(body?.success ? body : null);
    });
  });
}

const enrouteKey = ({ from, to, date }) =>
  `${from}|${to}|${date ? new Date(date).toISOString().split("T")[0] : "any"}`;

export async function joinEnrouteRoom(payload) {
  const { from, to, date } = payload || {};
  if (!from || !to) return null;
  const key = enrouteKey({ from, to, date });
  const existing = enrouteRooms.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    enrouteRooms.set(key, { count: 1, payload: { from, to, date } });
  }
  const s = await connectAppSocket();
  if (s?.connected) s.emit("joinEnroute", { from, to, date });
  return s;
}

export function leaveEnrouteRoom(payload) {
  const { from, to, date } = payload || {};
  if (!from || !to || !socket) return;
  const key = enrouteKey({ from, to, date });
  const entry = enrouteRooms.get(key);
  if (!entry) return;
  entry.count -= 1;
  if (entry.count <= 0) {
    enrouteRooms.delete(key);
    socket.emit("leaveEnroute", { from, to, date });
  }
}

/**
 * Subscribe to a socket event. Returns unsubscribe function (does not disconnect socket).
 */
export async function subscribeSocketEvent(event, handler) {
  const s = await connectAppSocket();
  if (!s) return () => {};

  s.on(event, handler);

  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);

  return () => {
    s.off(event, handler);
    listeners.get(event)?.delete(handler);
  };
}

export function getAppSocket() {
  return socket;
}

export function isAppSocketConnected() {
  return !!socket?.connected;
}
