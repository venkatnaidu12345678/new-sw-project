import { io } from "socket.io-client";
import { baseUrl } from "../Config";

let socket = null;
let consumerCount = 0;
const activeRooms = new Set();
const locationListeners = new Set();

const attachLocationListeners = () => {
  if (!socket) return;
  socket.off("locationUpdate");
  locationListeners.forEach((handler) => {
    socket.on("locationUpdate", handler);
  });
};

const rejoinRooms = () => {
  if (!socket?.connected) return;
  activeRooms.forEach((rideId) => {
    socket.emit("joinRide", rideId);
  });
};

export const getRideSocket = () => socket;

export const connectRideSocket = (token) =>
  new Promise((resolve, reject) => {
    if (!token) {
      reject(new Error("No auth token"));
      return;
    }

    consumerCount += 1;

    if (socket?.connected) {
      resolve(socket);
      return;
    }

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(baseUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
    });

    const onConnect = () => {
      cleanup();
      rejoinRooms();
      attachLocationListeners();
      resolve(socket);
    };
    const onError = (err) => {
      cleanup();
      consumerCount = Math.max(0, consumerCount - 1);
      reject(err);
    };
    const cleanup = () => {
      socket?.off("connect", onConnect);
      socket?.off("connect_error", onError);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
    socket.io.on("reconnect", () => {
      rejoinRooms();
      attachLocationListeners();
    });
  });

/** Decrement consumers; disconnect only when nothing uses the socket. */
export const releaseRideSocket = () => {
  consumerCount = Math.max(0, consumerCount - 1);
  if (consumerCount === 0 && socket) {
    socket.disconnect();
    socket = null;
    activeRooms.clear();
  }
};

export const joinRideRoom = (rideId) => {
  const id = rideId?.toString?.() || rideId;
  if (!id) return;
  activeRooms.add(id);
  if (socket?.connected) {
    socket.emit("joinRide", id);
  }
};

export const leaveRideRoom = (rideId) => {
  const id = rideId?.toString?.() || rideId;
  if (!id) return;
  activeRooms.delete(id);
  if (socket?.connected) {
    socket.emit("leaveRide", id);
  }
};

export const emitLocationViaSocket = (rideId, lat, lng) => {
  if (!socket?.connected || !rideId) return;
  const id = rideId?.toString?.() || rideId;
  socket.emit("updateLocation", {
    rideId: id,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
  });
};

export const subscribeLocationUpdates = (handler) => {
  locationListeners.add(handler);
  if (socket?.connected) {
    socket.on("locationUpdate", handler);
  }
  return () => {
    locationListeners.delete(handler);
    socket?.off("locationUpdate", handler);
  };
};

export const disconnectRideSocket = () => {
  consumerCount = 0;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  activeRooms.clear();
  locationListeners.clear();
};

/** Driver asks a passenger/courier to enable location during an active ride. */
export const requestParticipantLocationAccess = (rideId, targetUserId) =>
  new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Not connected to ride server"));
      return;
    }
    const rid = rideId?.toString?.() || rideId;
    const uid = targetUserId?.toString?.() || targetUserId;
    if (!rid || !uid) {
      reject(new Error("rideId and targetUserId required"));
      return;
    }
    socket.emit(
      "requestParticipantLocation",
      { rideId: rid, targetUserId: uid },
      (ack) => {
        if (ack?.success) resolve(ack);
        else reject(new Error(ack?.message || "Request failed"));
      }
    );
  });
