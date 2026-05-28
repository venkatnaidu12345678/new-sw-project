import React from "react";
import { View, Text, StyleSheet } from "react-native";
import BackButton from "../BackButton";
import { LAYOUT } from "../../theme/layout";

/**
 * Consistent top bar: back button + title.
 * Pass onBack to override navigation.goBack() (e.g. dashboard search mode).
 */
const ScreenHeader = ({ title, onBack, rightElement, style, backgroundColor }) => {
  return (
    <View
      style={[
        styles.row,
        backgroundColor != null && { backgroundColor },
        style,
      ]}
    >
      <BackButton onPress={onBack} style={styles.backBtn} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{rightElement || null}</View>
    </View>
  );
};

export default ScreenHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.sm,
    minHeight: 48,
  },
  backBtn: {
    paddingLeft: 0,
    paddingVertical: 4,
  },
  title: {
    flex: 1,
    fontSize: LAYOUT.font.title || 20,
    fontWeight: "700",
    color: LAYOUT.colors.text,
    marginLeft: 4,
  },
  right: {
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
