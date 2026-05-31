/**
 * Per-type notification card styling (icon gradients + unread highlight).
 */
export const getNotificationTypeThemes = (c) => {
  const dark = c.mode === "dark";

  return {
    ride: {
      icon: "car-sport",
      colors: ["#2563EB", "#3B82F6"],
      unreadBg: dark ? c.primaryMuted : "#DBEAFE",
    },
    chat: {
      icon: "chatbubble-ellipses",
      colors: ["#7C3AED", "#A855F7"],
      unreadBg: dark ? "#4C1D95" : "#EDE9FE",
    },
    message: {
      icon: "chatbubble-ellipses",
      colors: ["#7C3AED", "#A855F7"],
      unreadBg: dark ? "#4C1D95" : "#EDE9FE",
    },
    courier: {
      icon: "cube",
      colors: ["#F59E0B", "#F97316"],
      unreadBg: dark ? c.warningBg : "#FFEDD5",
    },
    payment: {
      icon: "wallet",
      colors: ["#10B981", "#059669"],
      unreadBg: dark ? c.successBg : "#D1FAE5",
    },
    request: {
      icon: "notifications",
      colors: ["#EC4899", "#F472B6"],
      unreadBg: dark ? "#831843" : "#FCE7F3",
    },
    default: {
      icon: "notifications",
      colors: ["#6366F1", "#818CF8"],
      unreadBg: dark ? c.surfaceAlt : "#E0E7FF",
    },
  };
};

export const resolveNotificationTheme = (type, c) => {
  const themes = getNotificationTypeThemes(c);
  const key = String(type || "").toLowerCase();
  if (key.includes("ride")) return themes.ride;
  if (key.includes("chat") || key.includes("message")) return themes.chat;
  if (key.includes("courier")) return themes.courier;
  if (key.includes("pay")) return themes.payment;
  if (key.includes("request")) return themes.request;
  return themes.default;
};
