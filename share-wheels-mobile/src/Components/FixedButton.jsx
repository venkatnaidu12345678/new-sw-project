import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DS } from "../theme/designSystem";

const FixedButton = ({
  title = "Next",
  onPress,
  disabled = false,
  loading = false,
  bottomInset,
}) => {
  const insets = useSafeAreaInsets();
  const bottom = bottomInset ?? insets.bottom + DS.spacing.md;

  return (
    <View style={[styles.fixedButtonContainer, { paddingBottom: bottom }]}>
      <TouchableOpacity
        style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
        onPress={onPress}
        disabled={disabled || loading || !onPress}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default FixedButton;

const styles = StyleSheet.create({
  fixedButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.spacing.screen,
    paddingTop: DS.spacing.md,
    backgroundColor: DS.colors.surface,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
  },
  button: {
    backgroundColor: DS.colors.primary,
    paddingVertical: DS.spacing.md,
    borderRadius: DS.radius.md,
    alignItems: "center",
    minHeight: DS.sizes.buttonHeight,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: DS.font.button,
    fontWeight: "600",
  },
});
