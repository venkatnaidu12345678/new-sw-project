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

export { scale, moderateScale, LAYOUT };
