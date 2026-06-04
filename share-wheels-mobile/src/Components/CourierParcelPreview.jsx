import React from "react";
import { View, Text, StyleSheet } from "react-native";
import RemoteImage from "./ui/RemoteImage";
import { LAYOUT } from "../theme/layout";
import { useThemedStyles } from "../theme/useThemedStyles";

export const formatCourierParcelLine = (courier) => {
  if (!courier) return "Parcel";
  const type = courier.courier_type?.trim?.();
  const desc = courier.what_to_deliver?.trim?.();
  if (type && desc) return `${type}: ${desc}`;
  return desc || type || "Parcel";
};

/**
 * Courier parcel photo + description — for driver "My Couriers" and request lists.
 */
const CourierParcelPreview = ({ courier, compact = false }) => {
  const styles = useThemedStyles(createStyles);
  if (!courier) return null;

  const imageUri = courier.courier_img;
  const line = formatCourierParcelLine(courier);
  const receiver = courier.courier_receiver_details;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {imageUri ? (
        <RemoteImage
          source={imageUri}
          style={[styles.image, compact && styles.imageCompact]}
          resizeMode="cover"
        />
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
      </View>
    </View>
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
  });
