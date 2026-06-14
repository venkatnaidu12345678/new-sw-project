/** Android channel IDs — must match Share-wheels-backend firebaseAdmin.js */
export const CHANNELS = {
  rides: "share_wheels_default",
  chat: "share_wheels_chat",
  reminders: "share_wheels_reminders",
};

export const resolveNotificationChannel = (type = "") => {
  const key = String(type || "").toLowerCase();
  if (key === "chat_message") return CHANNELS.chat;
  if (
    [
      "ride_start_reminder",
      "ride_expired",
      "passenger_request_expired",
      "courier_request_expired",
    ].includes(key)
  ) {
    return CHANNELS.reminders;
  }
  return CHANNELS.rides;
};
