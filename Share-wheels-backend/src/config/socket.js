const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Admin = require("../models/adminModel");
const { enrouteRoomKey } = require("../utils/socketEmit");

const createServerWithSocket = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  global.io = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error("Auth required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === "admin") {
        const admin = await Admin.findById(decoded.id);
        if (!admin) return next(new Error("Admin not found"));
        socket.admin = admin;
        socket.userType = "admin";
        return next();
      }

      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      socket.userType = "user";
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected", socket.id, socket.userType);

    if (socket.userType === "user" && socket.user?._id) {
      socket.join(`user:${socket.user._id.toString()}`);
    }

    socket.on("joinRide", async (rideId) => {
      if (!rideId) return;
      socket.join(`ride:${rideId}`);
      if (socket.userType !== "user" || !socket.user?._id) return;
      try {
        const rideTrackingService = require("../services/rideTrackingService");
        await rideTrackingService.emitRideTrackingSnapshot(socket, rideId);
      } catch (err) {
        console.warn("[socket] rideTrackingSnapshot:", err?.message || err);
      }
    });

    socket.on("requestRideTracking", async (rideId, ack) => {
      if (socket.userType !== "user" || !socket.user?._id) {
        if (typeof ack === "function") {
          ack({ success: false, message: "Unauthorized" });
        }
        return;
      }
      try {
        const rideTrackingService = require("../services/rideTrackingService");
        const result = await rideTrackingService.getTrackingForUser(
          socket.user,
          rideId
        );
        const body =
          result.status === 200
            ? { rideId: String(rideId), ...result.body }
            : result.body || { success: false, message: "Could not load tracking" };
        if (typeof ack === "function") ack(body);
        if (result.status === 200) {
          socket.emit("rideTrackingSnapshot", body);
        }
      } catch (err) {
        if (typeof ack === "function") {
          ack({ success: false, message: err.message || "Could not load tracking" });
        }
      }
    });

    socket.on("leaveRide", (rideId) => {
      if (rideId) socket.leave(`ride:${rideId}`);
    });

    socket.on("joinEnroute", (payload = {}) => {
      const { from, to, date } = payload;
      if (from && to) {
        socket.join(enrouteRoomKey(from, to, date));
      }
    });

    socket.on("leaveEnroute", (payload = {}) => {
      const { from, to, date } = payload;
      if (from && to) {
        socket.leave(enrouteRoomKey(from, to, date));
      }
    });

    socket.on("joinAdminTracking", async () => {
      if (socket.userType !== "admin") return;
      socket.join("admin:tracking");
      try {
        const rideTrackingService = require("../services/rideTrackingService");
        const result = await rideTrackingService.getActiveRidesForAdmin();
        if (result.status === 200) {
          socket.emit("activeRidesSnapshot", result.body);
        }
      } catch (err) {
        console.warn("[socket] activeRidesSnapshot:", err?.message || err);
      }
    });

    socket.on("requestActiveRides", async (ack) => {
      if (socket.userType !== "admin") return;
      try {
        const rideTrackingService = require("../services/rideTrackingService");
        const result = await rideTrackingService.getActiveRidesForAdmin();
        const body = result.body || { success: true, rides: [] };
        if (typeof ack === "function") ack(body);
        else socket.emit("activeRidesSnapshot", body);
      } catch (err) {
        if (typeof ack === "function") {
          ack({ success: false, message: err.message || "Could not load rides" });
        }
      }
    });

    socket.on("updateLocation", async (payload, ack) => {
      try {
        if (socket.userType !== "user") return;
        const rideId = payload?.rideId;
        if (!rideId) return;
        const rideTrackingService = require("../services/rideTrackingService");
        const result = await rideTrackingService.updateParticipantLocation(
          socket.user,
          rideId,
          payload
        );
        if (typeof ack === "function") {
          ack(result.body || { success: result.status === 200 });
        }
      } catch (err) {
        if (typeof ack === "function") {
          ack({ success: false, message: err.message || "Location update failed" });
        }
      }
    });

    socket.on("requestParticipantLocation", async (payload, ack) => {
      try {
        if (socket.userType !== "user") {
          if (typeof ack === "function") {
            ack({ success: false, message: "Unauthorized" });
          }
          return;
        }
        const rideTrackingService = require("../services/rideTrackingService");
        const result = await rideTrackingService.requestParticipantLocationAccess(
          socket.user,
          payload
        );
        if (typeof ack === "function") {
          ack(result.body || { success: result.status === 200 });
        }
      } catch (err) {
        if (typeof ack === "function") {
          ack({
            success: false,
            message: err.message || "Could not request location",
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });

  return { server, io };
};

module.exports = {
  createServerWithSocket,
};
