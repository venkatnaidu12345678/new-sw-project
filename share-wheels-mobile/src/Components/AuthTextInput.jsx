import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import AppTextInput from "./ui/AppTextInput";

const AuthTextInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  maxLength,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry === true;

  return (
    <View style={styles.container}>
      <AppTextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={isPassword && !showPassword}
        maxLength={maxLength}
      />
      {isPassword && (
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Icon
            name={showPassword ? "eye" : "eye-slash"}
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AuthTextInput;

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginBottom: 12,
  },
  input: {
    height: 50,
    paddingRight: 45,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
