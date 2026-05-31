import React from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Text,
  Dimensions,
} from "react-native";
import RemoteImage from "./RemoteImage";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const ImagePreviewModal = ({ visible, uri, title, onClose }) => {
  if (!visible || !uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.header}>
          {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <RemoteImage
          source={uri}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

export default ImagePreviewModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 48,
    left: 20,
    right: 20,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  image: {
    width: SCREEN_W - 32,
    height: SCREEN_H * 0.62,
    borderRadius: 12,
  },
});
