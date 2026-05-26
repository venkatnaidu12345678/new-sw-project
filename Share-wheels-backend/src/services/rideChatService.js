const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const RideMessage = require("../models/rideMessageModel");
const { canAccessRideChat, getRideParticipantRole } = require("./rideAccessHelper");

const emitChat = (rideId, payload) => {
  if (global.io) {
    global.io.to(`ride:${rideId}`).emit("chatMessage", payload);
  }
};

const directThreadFilter = (rideId, userId, peerId) => {
  const me = userId.toString();
  const peer = peerId.toString();
  return {
    rideId,
    $or: [
      { senderId: me, recipientId: peer },
      { senderId: peer, recipientId: me },
    ],
  };
};

const groupThreadFilter = (rideId) => ({
  rideId,
  $or: [{ recipientId: null }, { recipientId: { $exists: false } }],
});

const getMessages = async (user, rideId, { peerId } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId).select("creator passengers all_deliveries");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (!canAccessRideChat(ride, user._id)) {
    return { status: 403, body: { success: false, message: "Not allowed on this ride chat" } };
  }

  let filter = { rideId };
  if (peerId) {
    if (!mongoose.Types.ObjectId.isValid(peerId)) {
      return { status: 400, body: { success: false, message: "Invalid peer user ID" } };
    }
    const peerRole = getRideParticipantRole(ride, peerId);
    if (!peerRole) {
      return { status: 403, body: { success: false, message: "User is not on this ride" } };
    }
    filter = directThreadFilter(rideId, user._id, peerId);
  } else {
    filter = groupThreadFilter(rideId);
  }

  const messages = await RideMessage.find(filter)
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  return { status: 200, body: { success: true, messages, peerId: peerId || null } };
};

const sendMessage = async (user, rideId, { message, recipientId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const text = (message || "").trim();
  if (!text) return { status: 400, body: { success: false, message: "Message is required" } };

  const ride = await Ride.findById(rideId).select(
    "creator passengers all_deliveries status"
  );
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const role = getRideParticipantRole(ride, user._id);
  if (!canAccessRideChat(ride, user._id)) {
    return { status: 403, body: { success: false, message: "Not allowed on this ride chat" } };
  }

  let recipient = null;
  if (recipientId) {
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return { status: 400, body: { success: false, message: "Invalid recipient" } };
    }
    const peerRole = getRideParticipantRole(ride, recipientId);
    if (!peerRole) {
      return { status: 403, body: { success: false, message: "Recipient is not on this ride" } };
    }
    if (recipientId.toString() === user._id.toString()) {
      return { status: 400, body: { success: false, message: "Cannot message yourself" } };
    }
    recipient = recipientId;
  }

  const doc = await RideMessage.create({
    rideId,
    senderId: user._id,
    senderName: user.name || "User",
    senderRole: role,
    recipientId: recipient,
    message: text,
    readBy: [user._id],
  });

  const payload = {
    _id: doc._id,
    rideId: doc.rideId.toString(),
    senderId: doc.senderId.toString(),
    senderName: doc.senderName,
    senderRole: doc.senderRole,
    recipientId: doc.recipientId?.toString() || null,
    message: doc.message,
    createdAt: doc.createdAt,
  };

  emitChat(rideId, payload);

  return { status: 200, body: { success: true, message: payload } };
};

module.exports = { getMessages, sendMessage, emitChat };
