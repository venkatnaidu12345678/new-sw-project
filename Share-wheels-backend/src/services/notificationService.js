const mongoose = require("mongoose");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { sendPushNotification } = require("../utils/firebaseAdmin");
const { emitNotificationReceived } = require("../utils/socketEmit");

const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const notificationCutoff = () => new Date(Date.now() - NOTIFICATION_TTL_MS);

const resolveUserId = (userId) => {
  if (!userId) return null;
  if (userId instanceof mongoose.Types.ObjectId) return userId;
  if (userId._id) return userId._id;
  try {
    return new mongoose.Types.ObjectId(userId);
  } catch {
    return null;
  }
};

/** Delete in-app notifications older than 24 hours (optional per-user scope). */
const purgeExpiredNotifications = async (userId = null) => {
  const cutoff = notificationCutoff();
  const filter = { createdAt: { $lt: cutoff } };
  if (userId) {
    filter.userId = resolveUserId(userId) || userId;
  }
  const result = await Notification.deleteMany(filter);
  return result.deletedCount || 0;
};

/**
 * Persist in-app notification, push via FCM when possible, and notify connected clients.
 */
const notifyUser = async (userId, { title, body, type = "general", data = {} }) => {
  if (!userId || !title || !body) return { saved: false, pushed: false };

  const uid = resolveUserId(userId);
  if (!uid) return { saved: false, pushed: false };

  const dataPayload = Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [k, v == null ? "" : String(v)])
  );

  let doc;
  try {
    doc = await Notification.create({
      userId: uid,
      title,
      body,
      type,
      data: dataPayload,
      read: false,
    });
  } catch (err) {
    console.warn("[notifyUser] save failed:", err.message);
    return { saved: false, pushed: false };
  }

  const socketPayload = {
    notificationId: doc._id.toString(),
    title,
    body,
    type,
    ...dataPayload,
  };

  emitNotificationReceived(uid, socketPayload);

  const user = await User.findById(uid).select("fcmToken");
  let pushed = false;

  const pushData = {
    type,
    notificationId: doc._id.toString(),
    ...dataPayload,
  };

  const { isFirebaseReady } = require("../utils/firebaseAdmin");

  if (!isFirebaseReady()) {
    console.warn(
      "[notifyUser] FCM not configured on server — set FIREBASE_SERVICE_ACCOUNT_JSON on Render"
    );
  } else if (user?.fcmToken) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await sendPushNotification(
          user.fcmToken,
          title,
          body,
          pushData
        );
        if (result?.success) {
          pushed = true;
          break;
        }
        if (result?.invalidToken) {
          user.fcmToken = undefined;
          await user.save();
          console.warn(
            "[notifyUser] cleared invalid FCM token for user",
            uid.toString(),
            "— reinstall app / log in again after adding release SHA in Firebase"
          );
          break;
        }
        console.warn(
          "[notifyUser] FCM send failed:",
          result?.code || result?.reason || "unknown",
          "user",
          uid.toString()
        );
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (err) {
        console.warn("[notifyUser] FCM failed:", err.message);
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }
  } else {
    console.warn(
      "[notifyUser] no FCM token on file for user",
      uid.toString(),
      "— open release app, allow notifications, log in again"
    );
  }

  return { saved: true, pushed, notificationId: doc._id };
};

const listForUser = async (user, { limit = 50, skip = 0 } = {}) => {
  await purgeExpiredNotifications(user._id);

  const cutoff = notificationCutoff();
  const baseFilter = { userId: user._id, createdAt: { $gte: cutoff } };

  const items = await Notification.find(baseFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(limit, 100))
    .lean();

  const unreadCount = await Notification.countDocuments({
    ...baseFilter,
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
    { returnDocument: "after" }
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
  purgeExpiredNotifications,
  NOTIFICATION_TTL_MS,
};
