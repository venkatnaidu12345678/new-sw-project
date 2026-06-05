import React from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Text,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RemoteImage from "./RemoteImage";
import { getImageUri } from "../../Utils/imageUpload";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const resolveSource = (source, uri) => {
  const raw = source ?? uri;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  return raw?.uri || getImageUri(raw) || null;
};

/**
 * Full-screen image preview — stacks above bottom sheets and other overlays.
 */
const ImagePreviewModal = ({ visible, source, uri, title, subtitle, onClose }) => {
  const insets = useSafeAreaInsets();
  const resolvedUri = resolveSource(source, uri);

  if (!visible || !resolvedUri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close image preview"
        />

        <View
          style={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 12) + 8,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              {title ? (
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.imageFrame}>
            <RemoteImage
              source={resolvedUri}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.hint}>Tap outside the image to close</Text>
        </View>
      </View>
    </Modal>
  );
};

export default ImagePreviewModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    zIndex: 2,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  imageFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: SCREEN_H * 0.45,
  },
  image: {
    width: SCREEN_W - 32,
    height: "100%",
    maxHeight: SCREEN_H * 0.72,
    borderRadius: 12,
  },
  hint: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 12,
    marginTop: 10,
    fontWeight: "500",
  },
});
