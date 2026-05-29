import { LAYOUT, moderateScale } from "./layout";

export const AUTH_GRADIENTS = {
  screen: ["#0F172A", "#1E3A8A", "#2563EB", "#38BDF8"],
  screenLocations: [0, 0.35, 0.72, 1],
  hero: ["#4F46E5", "#2563EB", "#0EA5E9"],
  button: ["#4F46E5", "#2563EB", "#1D4ED8"],
  cardBorder: ["#6366F1", "#3B82F6", "#22D3EE"],
  otpBox: ["#FFFFFF", "#F0F9FF"],
  otpBorder: ["#818CF8", "#3B82F6", "#06B6D4"],
};

export const AUTH_COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",
  background: "#0F172A",
  surface: "#FFFFFF",
  surfaceGlass: "rgba(255, 255, 255, 0.96)",
  text: "#0F172A",
  textOnDark: "#F8FAFC",
  textMuted: "#64748B",
  textMutedOnDark: "#CBD5E1",
  border: "#E2E8F0",
  error: "#EF4444",
  white: "#FFFFFF",
  link: "#BAE6FD",
};

export const AUTH_SPACING = {
  screen: LAYOUT.spacing.screen,
  section: LAYOUT.spacing.lg,
  field: LAYOUT.spacing.md,
};

export const AUTH_FONT = {
  brand: moderateScale(18),
  title: moderateScale(24),
  subtitle: moderateScale(14),
  back: moderateScale(14),
  label: moderateScale(13),
};
