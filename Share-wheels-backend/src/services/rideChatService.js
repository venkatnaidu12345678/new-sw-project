const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const RideMessage = require("../models/rideMessageModel");
const User = require("../models/userModel");
const { canAccessRideChat, getRideParticipantRole } = require("./rideAccessHelper");
const { notifyUser } = require("./notificationService");

const USER_CHAT_FIELDS = "name profile_img";

const attachSenderAvatars = async (messages) => {
  if (!messages?.length) return messages;
  const ids = [
    ...new Set(
      messages
        .map((m) => m.senderId?.toString?.() || String(m.senderId || ""))
        .filter(Boolean)
    ),
  ];
  if (!ids.length) return messages;
  const users = await User.find({ _id: { $in: ids } })
    .select(USER_CHAT_FIELDS)
    .lean();
  const byId = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
  return messages.map((m) => {
    const sender = byId[m.senderId?.toString?.() || String(m.senderId || "")];
    return {
      ...m,
      senderAvatar: sender?.profile_img || null,
      senderName: m.senderName || sender?.name || "User",
    };
  });
};

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

  let messages = await RideMessage.find(filter)
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  messages = await attachSenderAvatars(messages);

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
    senderAvatar: user.profile_img || null,
    recipientId: doc.recipientId?.toString() || null,
    message: doc.message,
    createdAt: doc.createdAt,
  };

  emitChat(rideId, payload);

  if (recipient) {
    const preview =
      text.length > 120 ? `${text.slice(0, 117)}...` : text;
    await notifyUser(recipient, {
      title: user.name || "New message",
      body: preview,
      type: "chat_message",
      data: {
        rideId: rideId.toString(),
        peerId: user._id.toString(),
        peerName: user.name || "User",
        peerRole: role,
        senderAvatar: user.profile_img || "",
      },
    });
  }

  return { status: 200, body: { success: true, message: payload } };
};

const clearRideChatMessages = async (rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) return { deletedCount: 0 };
  const result = await RideMessage.deleteMany({ rideId });
  if (global.io) {
    global.io.to(`ride:${rideId}`).emit("chatCleared", { rideId: rideId.toString() });
  }
  return { deletedCount: result.deletedCount };
};

module.exports = { getMessages, sendMessage, emitChat, clearRideChatMessages };
