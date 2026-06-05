import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import RemoteImage from "./ui/RemoteImage";
import ImagePreviewModal from "./ui/ImagePreviewModal";
import { useThemedStyles } from "../theme/useThemedStyles";

export const formatCourierParcelLine = (courier) => {
  if (!courier) return "Parcel";
  const type = courier.courier_type?.trim?.();
  const desc = courier.what_to_deliver?.trim?.();
  if (type && desc) return `${type}: ${desc}`;
  return desc || type || "Parcel";
};

/**
 * Courier parcel photo + description — tap image for full-screen preview.
 */
const CourierParcelPreview = ({ courier, compact = false }) => {
  const styles = useThemedStyles(createStyles);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!courier) return null;

  const imageUri = courier.courier_img;
  const line = formatCourierParcelLine(courier);
  const receiver = courier.courier_receiver_details;

  return (
    <>
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        {imageUri ? (
          <Pressable
            onPress={() => setPreviewOpen(true)}
            accessibilityRole="imagebutton"
            accessibilityLabel="View parcel photo full screen"
            style={({ pressed }) => [pressed && styles.imagePressed]}
          >
            <RemoteImage
              source={imageUri}
              style={[styles.image, compact && styles.imageCompact]}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}
        <View style={[styles.textCol, !imageUri && styles.textColFull]}>
          <Text style={styles.title}>Parcel</Text>
          <Text style={styles.desc} numberOfLines={3}>
            {line}
          </Text>
          {receiver?.name ? (
            <Text style={styles.meta} numberOfLines={1}>
              To: {receiver.name}
              {receiver.mobile ? ` · ${receiver.mobile}` : ""}
            </Text>
          ) : null}
          {receiver?.Address ? (
            <Text style={styles.metaMuted} numberOfLines={2}>
              {receiver.Address}
            </Text>
          ) : null}
          {imageUri ? (
            <Text style={styles.tapHint}>Tap photo to view full size</Text>
          ) : null}
        </View>
      </View>

      <ImagePreviewModal
        visible={previewOpen}
        source={imageUri}
        title={line}
        subtitle={receiver?.name ? `To: ${receiver.name}` : undefined}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
};

export default CourierParcelPreview;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    wrapCompact: {
      marginTop: 8,
      paddingTop: 8,
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
      marginRight: 12,
    },
    imageCompact: {
      width: 64,
      height: 64,
    },
    imagePressed: {
      opacity: 0.85,
    },
    textCol: {
      flex: 1,
    },
    textColFull: {
      marginLeft: 0,
    },
    title: {
      fontSize: 11,
      fontWeight: "700",
      color: c.warningText,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    desc: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    meta: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 6,
    },
    metaMuted: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 4,
    },
    tapHint: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 6,
    },
  });
