const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Admin = require("../models/adminModel");

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

    socket.on("joinRide", (rideId) => {
      if (rideId) socket.join(`ride:${rideId}`);
    });

    socket.on("leaveRide", (rideId) => {
      if (rideId) socket.leave(`ride:${rideId}`);
    });

    socket.on("joinAdminTracking", () => {
      if (socket.userType === "admin") socket.join("admin:tracking");
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

    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });

  return { server, io };
};

module.exports = {
  createServerWithSocket,
};
