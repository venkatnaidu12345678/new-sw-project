export const AUTH_COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  error: "#EF4444",
  white: "#FFFFFF",
};

import { LAYOUT, moderateScale } from "./layout";

export const AUTH_SPACING = {
  screen: LAYOUT.spacing.screen,
  section: LAYOUT.spacing.lg,
  field: LAYOUT.spacing.md,
};

export const AUTH_FONT = {
  brand: moderateScale(18),
  title: moderateScale(22),
  subtitle: moderateScale(14),
  back: moderateScale(14),
};
