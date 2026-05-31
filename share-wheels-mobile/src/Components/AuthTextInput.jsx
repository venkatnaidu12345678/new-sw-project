import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import LinearGradient from "react-native-linear-gradient";
import AppTextInput from "./ui/AppTextInput";
import { AUTH_GRADIENTS } from "../theme/authTheme";
import { LAYOUT } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const AuthTextInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  maxLength,
  autoCapitalize,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry === true;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={AUTH_GRADIENTS.cardBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <View style={styles.inner}>
          <AppTextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            keyboardType={keyboardType}
            secureTextEntry={isPassword && !showPassword}
            maxLength={maxLength}
            autoCapitalize={autoCapitalize}
          />
          {isPassword && (
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Icon
                name={showPassword ? "eye" : "eye-slash"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default AuthTextInput;

const createStyles = (c) =>
  StyleSheet.create({
  container: {
    marginBottom: LAYOUT.spacing.sm,
  },
  border: {
    borderRadius: LAYOUT.radius.md + 2,
    padding: 1.5,
  },
  inner: {
    position: "relative",
    backgroundColor: c.surface,
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
  },
  input: {
    height: LAYOUT.sizes.inputHeight,
    paddingRight: 44,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
