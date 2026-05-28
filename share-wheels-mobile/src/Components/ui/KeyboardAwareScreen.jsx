import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Wraps screens/forms so inputs stay visible when the keyboard opens.
 * Use scrollable={true} for long forms; false for chat-style layouts with FlatList.
 */
const KeyboardAwareScreen = ({
  children,
  header,
  headerStyle,
  style,
  contentContainerStyle,
  scrollable = false,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = "always",
  scrollViewProps = {},
}) => {
  const insets = useSafeAreaInsets();
  const offset =
    keyboardVerticalOffset + (Platform.OS === "ios" ? insets.top : 0);

  const behavior = Platform.OS === "ios" ? "padding" : "padding";

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollGrow, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      bounces={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={behavior}
      keyboardVerticalOffset={offset}
    >
      {header ? (
        <View style={[styles.headerSlot, headerStyle]}>{header}</View>
      ) : null}
      {body}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollGrow: { flexGrow: 1 },
  headerSlot: {
    flexShrink: 0,
    zIndex: 10,
    elevation: 4,
  },
});

export default KeyboardAwareScreen;
