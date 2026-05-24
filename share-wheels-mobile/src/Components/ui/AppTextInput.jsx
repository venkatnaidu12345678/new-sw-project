import React from "react";
import { TextInput, StyleSheet } from "react-native";
import { INPUT_COLORS, inputFieldStyle, inputDefaults } from "../../theme/inputTheme";

/**
 * TextInput with visible placeholder + text color on all platforms.
 */
const AppTextInput = ({ style, multiline, ...props }) => (
  <TextInput
    {...inputDefaults}
    {...props}
    multiline={multiline}
    style={[
      styles.base,
      multiline && styles.multiline,
      style,
    ]}
  />
);

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

export { INPUT_COLORS };
