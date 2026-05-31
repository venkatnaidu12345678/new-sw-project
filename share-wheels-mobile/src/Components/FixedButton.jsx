import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DS } from "../theme/designSystem";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const FixedButton = ({
  title = "Next",
  onPress,
  disabled = false,
  loading = false,
  bottomInset,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottom = bottomInset ?? insets.bottom + DS.spacing.md;

  return (
    <View style={[styles.fixedButtonContainer, { paddingBottom: bottom }]}>
      <TouchableOpacity
        style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
        onPress={onPress}
        disabled={disabled || loading || !onPress}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.inverseText} />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default FixedButton;

const createStyles = (c) =>
  StyleSheet.create({
    fixedButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: DS.spacing.screen,
      paddingTop: DS.spacing.md,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    button: {
      backgroundColor: c.primary,
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
      color: c.inverseText,
      fontSize: DS.font.button,
      fontWeight: "600",
    },
  });
