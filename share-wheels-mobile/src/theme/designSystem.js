import { LAYOUT, scale, moderateScale } from "./layout";

/** Shared tokens for consistent UI across screens */
export const DS = {
  ...LAYOUT,
  colors: {
    ...LAYOUT.colors,
    primary: "#2563EB",
    primaryMuted: "#DBEAFE",
    success: "#10B981",
    successMuted: "#D1FAE5",
    warning: "#F59E0B",
    warningMuted: "#FEF3C7",
    danger: "#EF4444",
    dangerMuted: "#FEE2E2",
    driver: "#007AFF",
    passenger: "#10B981",
    courier: "#F59E0B",
  },
  font: {
    ...LAYOUT.font,
    button: moderateScale(15),
  },
  shadow: {
    card: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  sizes: {
    ...LAYOUT.sizes,
    otpBox: scale(48),
    chipHeight: scale(32),
  },
};

/** Map app theme tokens to DS shape for screens that use DS.colors */
export const themeToDS = (c) => ({
  ...LAYOUT,
  colors: {
    background: c.background,
    surface: c.surface,
    text: c.text,
    textSecondary: c.textSecondary,
    textMuted: c.textMuted,
    border: c.border,
    primary: c.primary,
    primaryMuted: c.primaryMuted,
    success: c.successText,
    successMuted: c.successBg,
    warning: c.warningText,
    warningMuted: c.warningBg,
    danger: c.errorText,
    dangerMuted: c.errorBg,
    driver: c.primary,
    passenger: c.successText,
    courier: c.warningText,
  },
  font: {
    ...LAYOUT.font,
    button: moderateScale(15),
  },
  shadow: {
    card: {
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  sizes: {
    ...LAYOUT.sizes,
    otpBox: scale(48),
    chipHeight: scale(32),
  },
});

export { scale, moderateScale, LAYOUT };
