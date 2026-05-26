import React from "react";
import { View, Text, StyleSheet } from "react-native";

/** Small unread dot or count for chat / message entry points */
const MessageIndicator = ({ count = 0, style }) => {
  if (!count || count <= 0) return null;
  return (
    <View style={[styles.dot, style]}>
      {count > 0 ? (
        <Text style={styles.text}>{count > 9 ? "9+" : count}</Text>
      ) : null}
    </View>
  );
};

export default MessageIndicator;

const styles = StyleSheet.create({
  dot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
});
