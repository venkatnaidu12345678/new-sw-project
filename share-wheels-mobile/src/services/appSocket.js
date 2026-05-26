import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseUrl } from "../Config";

let socket = null;
let connectPromise = null;
const listeners = new Map();
const rideRoomRefs = new Map();
const enrouteRoomRefs = new Map();

const getSocketUrl = () => baseUrl.replace(/\/$/, "");

export async function connectAppSocket() {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;

  if (socket?.connected) return socket;

  if (connectPromise) return connectPromise;

  connectPromise = new Promise((resolve) => {
    if (!socket) {
      socket = io(getSocketUrl(), {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        if (__DEV__) console.log("[socket] connected", socket.id);
      });

      socket.on("disconnect", (reason) => {
        if (__DEV__) console.log("[socket] disconnected", reason);
      });

      socket.on("connect_error", (err) => {
        if (__DEV__) console.warn("[socket] connect_error", err?.message);
      });

      socket.io.on("reconnect", async () => {
        const t = await AsyncStorage.getItem("token");
        if (t && socket) socket.auth = { token: t };
      });
    }

    const onConnect = () => {
      socket.off("connect", onConnect);
      connectPromise = null;
      resolve(socket);
    };

    if (socket.connected) {
      connectPromise = null;
      resolve(socket);
      return;
    }

    socket.on("connect", onConnect);
    socket.connect();
  });

  return connectPromise;
}

export function disconnectAppSocket() {
  connectPromise = null;
  rideRoomRefs.clear();
  enrouteRoomRefs.clear();
  if (socket) {
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
  if (s) s.emit("joinRide", id);
  return s;
}

export function leaveRideRoom(rideId) {
  const id = rideId?.toString?.() || rideId;
  if (!id || !socket) return;
  if (dropRef(rideRoomRefs, id)) {
    socket.emit("leaveRide", id);
  }
}

const enrouteKey = ({ from, to, date }) =>
  `${from}|${to}|${date ? new Date(date).toISOString().split("T")[0] : "any"}`;

export async function joinEnrouteRoom({ from, to, date }) {
  if (!from || !to) return null;
  const key = enrouteKey({ from, to, date });
  bumpRef(enrouteRoomRefs, key);
  const s = await connectAppSocket();
  if (s) s.emit("joinEnroute", { from, to, date });
  return s;
}

export function leaveEnrouteRoom({ from, to, date }) {
  if (!from || !to || !socket) return;
  const key = enrouteKey({ from, to, date });
  if (dropRef(enrouteRoomRefs, key)) {
    socket.emit("leaveEnroute", { from, to, date });
  }
}

/**
 * Subscribe to a socket event. Returns unsubscribe function.
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
