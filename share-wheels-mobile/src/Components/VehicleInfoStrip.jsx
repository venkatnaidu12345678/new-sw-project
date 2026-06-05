import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import RemoteImage from "./ui/RemoteImage";
import ImagePreviewModal from "./ui/ImagePreviewModal";
import caricon from "../assets/caricon.png";
import { LAYOUT } from "../theme/layout";
import { useThemedStyles } from "../theme/useThemedStyles";

export const formatVehicleLabel = (vehicle) => {
  if (!vehicle) return "";
  const parts = [vehicle.type, vehicle.company, vehicle.model]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean);
  return parts.join(" · ");
};

/**
 * Vehicle summary with optional photo — tap image for full-screen preview.
 */
const VehicleInfoStrip = ({ vehicle, compact = false }) => {
  const styles = useThemedStyles(createStyles);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!vehicle) return null;

  const label = formatVehicleLabel(vehicle);
  const plate = vehicle.car_no?.trim?.();
  const imageUri = vehicle.car_image;

  if (!label && !plate && !imageUri) return null;

  const imageBlock = imageUri ? (
    <Pressable
      onPress={() => setPreviewOpen(true)}
      accessibilityRole="imagebutton"
      accessibilityLabel="View vehicle photo full screen"
      style={({ pressed }) => [pressed && styles.imagePressed]}
    >
      <RemoteImage
        source={imageUri}
        style={[styles.image, compact && styles.imageCompact]}
        resizeMode="cover"
      />
    </Pressable>
  ) : (
    <View style={[styles.imagePlaceholder, compact && styles.imageCompact]}>
      <Image source={caricon} style={styles.placeholderIcon} />
    </View>
  );

  return (
    <>
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        {imageBlock}
        <View style={styles.textCol}>
          <Text style={styles.title}>Vehicle</Text>
          {label ? (
            <Text style={styles.label} numberOfLines={2}>
              {label}
            </Text>
          ) : null}
          {plate ? <Text style={styles.plate}>Reg: {plate}</Text> : null}
          {imageUri ? (
            <Text style={styles.tapHint}>Tap photo to view full size</Text>
          ) : null}
        </View>
      </View>

      <ImagePreviewModal
        visible={previewOpen}
        source={imageUri}
        title={label || "Vehicle"}
        subtitle={plate ? `Reg: ${plate}` : undefined}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
};

export default VehicleInfoStrip;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderRadius: LAYOUT.radius?.md || 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 8,
    },
    wrapCompact: {
      padding: 10,
    },
    image: {
      width: 88,
      height: 66,
      borderRadius: 10,
      backgroundColor: c.chipBg,
    },
    imageCompact: {
      width: 72,
      height: 54,
    },
    imagePressed: {
      opacity: 0.85,
    },
    imagePlaceholder: {
      width: 88,
      height: 66,
      borderRadius: 10,
      backgroundColor: c.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderIcon: {
      width: 28,
      height: 28,
      opacity: 0.7,
    },
    textCol: {
      flex: 1,
      marginLeft: 12,
    },
    title: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    plate: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    tapHint: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 6,
    },
  });
