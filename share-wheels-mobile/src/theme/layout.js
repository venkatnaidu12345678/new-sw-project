import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/** Scale sizes for different phone widths (clamped for very small/large screens). */
export const scale = (size) => {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  const clamped = Math.min(Math.max(ratio, 0.82), 1.12);
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
};

export const verticalScale = (size) => {
  const ratio = SCREEN_HEIGHT / BASE_HEIGHT;
  const clamped = Math.min(Math.max(ratio, 0.85), 1.1);
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
};

export const moderateScale = (size, factor = 0.35) =>
  Math.round(size + (scale(size) - size) * factor);

export const LAYOUT = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  colors: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#E2E8F0",
    primary: "#2563EB",
  },
  spacing: {
    xs: scale(4),
    sm: scale(8),
    md: scale(12),
    lg: scale(16),
    xl: scale(20),
    screen: scale(16),
  },
  radius: {
    sm: scale(8),
    md: scale(12),
    lg: scale(16),
    xl: scale(20),
  },
  font: {
    hero: moderateScale(24),
    title: moderateScale(20),
    section: moderateScale(17),
    body: moderateScale(14),
    label: moderateScale(13),
    small: moderateScale(12),
    tiny: moderateScale(11),
  },
  sizes: {
    inputHeight: verticalScale(44),
    buttonHeight: verticalScale(46),
    avatarSm: scale(32),
    avatarMd: scale(40),
    avatarLg: scale(48),
    headerAvatar: scale(52),
    tabBarHeight: Platform.OS === "ios" ? 58 : 54,
    tabBarBottom: Platform.OS === "ios" ? 16 : 8,
    fabSize: scale(52),
  },
};

/** Space needed above home-indicator + floating tab bar. */
export const getTabBarInset = (bottomInset = 0) =>
  LAYOUT.sizes.tabBarHeight +
  LAYOUT.sizes.tabBarBottom +
  bottomInset +
  scale(12);

export const getScrollBottomPadding = (bottomInset = 0, extra = 0) =>
  getTabBarInset(bottomInset) + extra;
