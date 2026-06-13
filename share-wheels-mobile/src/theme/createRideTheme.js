/** Visual tokens for the driver create-ride flow (light defaults). */
export const CR = {
  gradient: ["#1D4ED8", "#4F46E5", "#7C3AED"],
  gradientSoft: ["#EFF6FF", "#EEF2FF", "#F5F3FF"],
  heroIcon: "#2563EB",
  sections: {
    vehicle: { icon: "car-sport", bg: "#DBEAFE", color: "#1D4ED8" },
    route: { icon: "navigate", bg: "#DBEAFE", color: "#2563EB" },
    schedule: { icon: "calendar", bg: "#E0E7FF", color: "#4F46E5" },
    pricing: { icon: "cash", bg: "#FEF3C7", color: "#D97706" },
    optional: { icon: "options", bg: "#FCE7F3", color: "#DB2777" },
  },
  from: { dot: "#22C55E", label: "#15803D", inputBg: "#F0FDF4", border: "#BBF7D0" },
  to: { dot: "#F97316", label: "#C2410C", inputBg: "#FFF7ED", border: "#FED7AA" },
  time: { bg: "#EEF2FF", icon: "#4F46E5", border: "#C7D2FE" },
  date: { bg: "#ECFDF5", icon: "#059669", border: "#A7F3D0" },
  seats: { bg: "#F5F3FF", icon: "#7C3AED", border: "#DDD6FE" },
  price: { bg: "#FFFBEB", icon: "#D97706", border: "#FDE68A" },
  surface: "#FFFFFF",
  pageBg: "#F1F5F9",
  cardBorder: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
};

/** Theme-aware create-ride tokens. */
export const getCreateRideTheme = (c) => ({
  gradient: c.heroGradient,
  gradientSoft: [c.primaryMuted, c.surfaceAlt, c.background],
  heroIcon: c.primary,
  sections: {
    vehicle: { icon: "car-sport", bg: c.tintBlue, color: c.primary },
    route: { icon: "navigate", bg: c.tintBlue, color: c.primary },
    schedule: { icon: "calendar", bg: c.tintBlue, color: c.primaryText },
    pricing: { icon: "cash", bg: c.warningBg, color: c.warningText },
    optional: { icon: "options", bg: c.tintPurple, color: "#DB2777" },
  },
  from: {
    dot: c.successText,
    label: c.successText,
    inputBg: c.surfaceAlt,
    border: c.border,
  },
  to: {
    dot: c.warningText,
    label: c.warningText,
    inputBg: c.surfaceAlt,
    border: c.border,
  },
  time: { bg: c.surfaceAlt, icon: c.primary, border: c.border },
  date: { bg: c.surfaceAlt, icon: c.successText, border: c.border },
  seats: { bg: c.surfaceAlt, icon: c.primaryText, border: c.border },
  price: { bg: c.warningBg, icon: c.warningText, border: c.warningBorder },
  surface: c.surface,
  pageBg: c.background,
  cardBorder: c.border,
  text: c.text,
  textMuted: c.textMuted,
});
