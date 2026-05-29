import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { AUTH_COLORS, AUTH_GRADIENTS } from "../theme/authTheme";
import { LAYOUT } from "../theme/layout";

const AuthButton = ({
  type = "submit",
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  const getLabel = () => {
    if (title) return title;
    switch (type) {
      case "signin":
        return "Sign In";
      case "signup":
        return "Sign Up";
      case "save":
        return "Save Details";
      case "verify":
        return "Verify code";
      default:
        return "Submit";
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.touch, style, isDisabled && styles.touchDisabled]}
    >
      <LinearGradient
        colors={isDisabled ? ["#94A3B8", "#64748B"] : AUTH_GRADIENTS.button}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color={AUTH_COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>{getLabel()}</Text>
        )}
      </LinearGradient>
      <View style={styles.shine} pointerEvents="none" />
    </TouchableOpacity>
  );
};

export default AuthButton;

const styles = StyleSheet.create({
  touch: {
    marginTop: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.xs,
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  touchDisabled: {
    opacity: 0.85,
    elevation: 0,
    shadowOpacity: 0,
  },
  button: {
    height: LAYOUT.sizes.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: LAYOUT.radius.md,
  },
  buttonText: {
    color: AUTH_COLORS.white,
    fontSize: LAYOUT.font.body,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: LAYOUT.radius.md,
  },
});
