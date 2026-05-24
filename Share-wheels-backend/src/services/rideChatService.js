const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const RideMessage = require("../models/rideMessageModel");
const { canAccessRideChat, getRideParticipantRole } = require("./rideAccessHelper");

const emitChat = (rideId, payload) => {
  if (global.io) {
    global.io.to(`ride:${rideId}`).emit("chatMessage", payload);
  }
};

const getMessages = async (user, rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId).select("creator passengers");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (!canAccessRideChat(ride, user._id)) {
    return { status: 403, body: { success: false, message: "Not allowed on this ride chat" } };
  }

  const messages = await RideMessage.find({ rideId })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  return { status: 200, body: { success: true, messages } };
};

const sendMessage = async (user, rideId, { message }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const text = (message || "").trim();
  if (!text) return { status: 400, body: { success: false, message: "Message is required" } };

  const ride = await Ride.findById(rideId).select("creator passengers status");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const role = getRideParticipantRole(ride, user._id);
  if (!canAccessRideChat(ride, user._id)) {
    return { status: 403, body: { success: false, message: "Only driver and passengers can chat" } };
  }

  const doc = await RideMessage.create({
    rideId,
    senderId: user._id,
    senderName: user.name || "User",
    senderRole: role,
    message: text,
    readBy: [user._id],
  });

  const payload = {
    _id: doc._id,
    rideId: doc.rideId.toString(),
    senderId: doc.senderId.toString(),
    senderName: doc.senderName,
    senderRole: doc.senderRole,
    message: doc.message,
    createdAt: doc.createdAt,
  };

  emitChat(rideId, payload);

  return { status: 200, body: { success: true, message: payload } };
};

module.exports = { getMessages, sendMessage, emitChat };
