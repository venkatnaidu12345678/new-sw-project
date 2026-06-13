import { io } from "socket.io-client";

let socket = null;
let connectPromise = null;
let retainCount = 0;

export const getSocketUrl = () => {
  const api = import.meta.env.VITE_API_URL || "/api";
  if (typeof api === "string" && api.startsWith("http")) {
    try {
      return new URL(api).origin;
    } catch {
      return api.replace(/\/api\/?$/, "");
    }
  }
  return import.meta.env.VITE_SOCKET_URL || window.location.origin;
};

const getAdminToken = () => localStorage.getItem("adminToken");

export const connectAdminSocket = () => {
  const token = getAdminToken();
  if (!token) {
    return Promise.reject(new Error("Admin not authenticated"));
  }

  retainCount += 1;

  if (socket?.connected) {
    return Promise.resolve(socket);
  }

  if (connectPromise) return connectPromise;

  connectPromise = new Promise((resolve, reject) => {
    if (!socket) {
      socket = io(getSocketUrl(), {
        auth: { token },
        transports: ["websocket", "polling"],
        autoConnect: true,
      });
    } else {
      socket.auth = { token };
      if (!socket.connected) socket.connect();
    }

    const onConnect = () => {
      socket.emit("joinAdminTracking");
      cleanup();
      connectPromise = null;
      resolve(socket);
    };

    const onError = (err) => {
      cleanup();
      connectPromise = null;
      reject(err);
    };

    const cleanup = () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onError);

    if (socket.connected) onConnect();
  });

  return connectPromise;
};

export const disconnectAdminSocket = () => {
  retainCount = Math.max(0, retainCount - 1);
  if (retainCount === 0 && socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    connectPromise = null;
  }
};

export const getAdminSocket = () => socket;

export const requestActiveRidesSnapshot = () =>
  new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }
    socket.timeout(10000).emit("requestActiveRides", (err, body) => {
      if (err) {
        reject(new Error(err.message || "Refresh timed out"));
        return;
      }
      if (body?.success === false) {
        reject(new Error(body.message || "Could not refresh rides"));
        return;
      }
      resolve(body || { rides: [] });
    });
  });
