import React, { useState } from "react";
import { View, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import LinearGradient from "react-native-linear-gradient";
import { AUTH_GRADIENTS } from "../theme/authTheme";
import { INPUT_COLORS, inputDefaults } from "../theme/inputTheme";
import { LAYOUT } from "../theme/layout";

const AuthTextInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  maxLength,
  autoCapitalize,
}) => {
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
          <TextInput
            {...inputDefaults}
            style={[styles.input, isPassword && styles.inputWithEye]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={INPUT_COLORS.placeholder}
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
                color={INPUT_COLORS.placeholder}
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default AuthTextInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.spacing.sm,
  },
  border: {
    borderRadius: LAYOUT.radius.md + 2,
    padding: 1.5,
  },
  inner: {
    position: "relative",
    backgroundColor: INPUT_COLORS.background,
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
  },
  input: {
    height: LAYOUT.sizes.inputHeight,
    paddingHorizontal: LAYOUT.spacing.md,
    backgroundColor: "transparent",
    borderWidth: 0,
    color: INPUT_COLORS.text,
    fontSize: LAYOUT.font.body,
  },
  inputWithEye: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
