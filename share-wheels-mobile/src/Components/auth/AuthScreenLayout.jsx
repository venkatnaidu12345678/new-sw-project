import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import KeyboardAwareScreen from "../ui/KeyboardAwareScreen";
import ScreenContainer from "../ui/ScreenContainer";
import { AUTH_COLORS, AUTH_SPACING, AUTH_FONT } from "../../theme/authTheme";
import { LAYOUT, scale } from "../../theme/layout";
import icon from "../../assets/icon.png";

const AuthScreenLayout = ({
  title,
  subtitle,
  children,
  footer,
  showBack,
  onBack,
}) => (
  <ScreenContainer backgroundColor={AUTH_COLORS.background} edges={["top", "bottom"]}>
    <KeyboardAwareScreen
      scrollable
      contentContainerStyle={styles.scroll}
      header={
        <View style={styles.headerBlock}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.brandRow}>
            <Image source={icon} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brand}>Share Wheels</Text>
              <Text style={styles.brandTag}>Ride together, save together</Text>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          {!!subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      }
      headerStyle={styles.headerWrap}
    >
      <View style={styles.form}>{children}</View>
      {footer}
    </KeyboardAwareScreen>
  </ScreenContainer>
);

export default AuthScreenLayout;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: AUTH_SPACING.screen,
    paddingTop: LAYOUT.spacing.sm,
    backgroundColor: AUTH_COLORS.background,
  },
  headerBlock: {
    flexShrink: 0,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: AUTH_SPACING.screen,
    paddingBottom: LAYOUT.spacing.lg,
  },
  backBtn: { marginBottom: LAYOUT.spacing.sm },
  backText: {
    fontSize: AUTH_FONT.back,
    color: AUTH_COLORS.primary,
    fontWeight: "600",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.lg,
    gap: scale(12),
  },
  logo: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
  },
  brand: {
    fontSize: AUTH_FONT.brand,
    fontWeight: "800",
    color: AUTH_COLORS.text,
  },
  brandTag: {
    fontSize: AUTH_FONT.subtitle,
    color: AUTH_COLORS.textMuted,
    marginTop: 2,
  },
  title: {
    fontSize: AUTH_FONT.title,
    fontWeight: "800",
    color: AUTH_COLORS.text,
    marginBottom: LAYOUT.spacing.sm,
  },
  subtitle: {
    fontSize: AUTH_FONT.subtitle,
    color: AUTH_COLORS.textMuted,
    lineHeight: scale(20),
    marginBottom: LAYOUT.spacing.lg,
  },
  form: { width: "100%" },
});
