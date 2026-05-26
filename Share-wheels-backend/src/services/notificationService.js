const mongoose = require("mongoose");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { sendPushNotification } = require("../utils/firebaseAdmin");

/**
 * Persist in-app notification and send FCM push when token exists.
 */
const notifyUser = async (userId, { title, body, type = "general", data = {} }) => {
  if (!userId || !title || !body) return { saved: false, pushed: false };

  const uid =
    userId instanceof mongoose.Types.ObjectId
      ? userId
      : new mongoose.Types.ObjectId(userId);

  const doc = await Notification.create({
    userId: uid,
    title,
    body,
    type,
    data,
    read: false,
  });

  const user = await User.findById(uid).select("fcmToken");
  let pushed = false;

  if (user?.fcmToken) {
    const result = await sendPushNotification(user.fcmToken, title, body, {
      type,
      notificationId: doc._id.toString(),
      ...data,
    });
    pushed = !!result?.success;
    if (result?.invalidToken) {
      user.fcmToken = undefined;
      await user.save();
    }
  }

  return { saved: true, pushed, notificationId: doc._id };
};

const listForUser = async (user, { limit = 50, skip = 0 } = {}) => {
  const items = await Notification.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(limit, 100))
    .lean();

  const unreadCount = await Notification.countDocuments({
    userId: user._id,
    read: false,
  });

  return {
    status: 200,
    body: {
      success: true,
      notifications: items,
      unreadCount,
    },
  };
};

const markRead = async (user, notificationId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return { status: 400, body: { success: false, message: "Invalid notification id" } };
  }
  const doc = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: user._id },
    { read: true },
    { new: true }
  );
  if (!doc) {
    return { status: 404, body: { success: false, message: "Notification not found" } };
  }
  const unreadCount = await Notification.countDocuments({
    userId: user._id,
    read: false,
  });
  return { status: 200, body: { success: true, notification: doc, unreadCount } };
};

const markAllRead = async (user) => {
  await Notification.updateMany({ userId: user._id, read: false }, { read: true });
  return {
    status: 200,
    body: { success: true, unreadCount: 0 },
  };
};

module.exports = {
  notifyUser,
  listForUser,
  markRead,
  markAllRead,
};
