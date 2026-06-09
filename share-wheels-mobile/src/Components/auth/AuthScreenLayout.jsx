import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardAwareScreen from "../ui/KeyboardAwareScreen";
import {
  AUTH_COLORS,
  AUTH_SPACING,
  AUTH_FONT,
  AUTH_GRADIENTS,
} from "../../theme/authTheme";
import { LAYOUT, scale } from "../../theme/layout";
import icon from "../../assets/icon.png";

const AuthScreenLayout = ({
  title,
  subtitle,
  children,
  footer,
  showBack,
  onBack,
  centerContent = false,
}) => {
  const insets = useSafeAreaInsets();

  const formSection = (
    <>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <LinearGradient
        colors={AUTH_GRADIENTS.cardBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardBorder}
      >
        <View style={styles.card}>{children}</View>
      </LinearGradient>

      {footer ? (
        <View style={[styles.footerWrap, centerContent && styles.footerWrapCentered]}>
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <LinearGradient
      colors={AUTH_GRADIENTS.screen}
      locations={AUTH_GRADIENTS.screenLocations}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View
        style={[
          styles.brandHeader,
          {
            paddingTop: insets.top + LAYOUT.spacing.md,
            paddingHorizontal: AUTH_SPACING.screen,
          },
        ]}
      >
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : null}

        {!showBack ? (
          <View style={styles.brandRow}>
            <LinearGradient
              colors={AUTH_GRADIENTS.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoWrap}
            >
              <Image source={icon} style={styles.logo} resizeMode="contain" />
            </LinearGradient>
            <View style={styles.brandTextCol}>
              <Text style={styles.brand}>Share Wheels</Text>
              <Text style={styles.brandTag}>Ride together, save together</Text>
            </View>
          </View>
        ) : null}
      </View>

      <KeyboardAwareScreen
        scrollable
        style={styles.formArea}
        contentContainerStyle={[
          styles.scroll,
          centerContent && styles.scrollCentered,
          {
            paddingHorizontal: AUTH_SPACING.screen,
            paddingBottom: insets.bottom + LAYOUT.spacing.lg,
          },
        ]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {centerContent ? (
          <View style={styles.centeredSection}>{formSection}</View>
        ) : (
          formSection
        )}
      </KeyboardAwareScreen>
    </LinearGradient>
  );
};

export default AuthScreenLayout;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  brandHeader: {
    flexShrink: 0,
  },
  formArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  scrollCentered: {
    justifyContent: "center",
  },
  centeredSection: {
    width: "100%",
  },
  backBtn: {
    marginBottom: LAYOUT.spacing.sm,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: AUTH_FONT.back,
    color: AUTH_COLORS.link,
    fontWeight: "600",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.sm,
    gap: scale(12),
  },
  logoWrap: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    padding: scale(6),
  },
  logo: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
  },
  brandTextCol: {
    flex: 1,
    justifyContent: "center",
  },
  brand: {
    fontSize: AUTH_FONT.brand,
    fontWeight: "800",
    color: AUTH_COLORS.textOnDark,
  },
  brandTag: {
    fontSize: AUTH_FONT.subtitle,
    color: AUTH_COLORS.textMutedOnDark,
    marginTop: 2,
  },
  title: {
    fontSize: AUTH_FONT.title,
    fontWeight: "800",
    color: AUTH_COLORS.textOnDark,
    marginBottom: LAYOUT.spacing.xs,
  },
  subtitle: {
    fontSize: AUTH_FONT.subtitle,
    color: AUTH_COLORS.textMutedOnDark,
    lineHeight: scale(20),
    marginBottom: LAYOUT.spacing.md,
  },
  cardBorder: {
    borderRadius: LAYOUT.radius.lg + 2,
    padding: 2,
  },
  card: {
    backgroundColor: AUTH_COLORS.surfaceGlass,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.lg,
    paddingBottom: LAYOUT.spacing.md,
  },
  footerWrap: {
    marginTop: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.spacing.xs,
  },
  footerWrapCentered: {
    alignItems: "center",
  },
});
