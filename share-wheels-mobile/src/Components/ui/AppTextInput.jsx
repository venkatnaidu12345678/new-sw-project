import React, { useMemo } from "react";
import { TextInput, StyleSheet } from "react-native";
import { inputFieldStyle, inputDefaults } from "../../theme/inputTheme";
import { useTheme } from "../../context/ThemeContext";

/**
 * TextInput with visible placeholder + text color on all platforms.
 */
const AppTextInput = ({ style, multiline, ...props }) => {
  const { input } = useTheme();
  const themed = useMemo(
    () => ({
      color: input.text,
      borderColor: input.border,
      backgroundColor: input.background,
    }),
    [input]
  );

  return (
    <TextInput
      {...inputDefaults}
      placeholderTextColor={input.placeholder}
      {...props}
      multiline={multiline}
      style={[styles.base, themed, multiline && styles.multiline, style]}
    />
  );
};

export default AppTextInput;

const styles = StyleSheet.create({
  base: {
    ...inputFieldStyle,
  },
  multiline: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
});
