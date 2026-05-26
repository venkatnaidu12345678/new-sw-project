import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

/**
 * Full-screen transparent overlay — closes dropdowns/tooltips on outside tap.
 */
export const OutsideDismiss = ({ visible, onDismiss, children }) => {
  if (!visible) return children || null;

  return (
    <>
      <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
        <Pressable style={styles.overlay} onPress={onDismiss} />
      </Modal>
      {children}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
