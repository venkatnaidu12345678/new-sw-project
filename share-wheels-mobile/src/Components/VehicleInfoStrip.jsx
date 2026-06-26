import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import RemoteImage from "./ui/RemoteImage";
import ImagePreviewModal from "./ui/ImagePreviewModal";
import { LAYOUT } from "../theme/layout";
import { useThemedStyles } from "../theme/useThemedStyles";
import {
  formatVehicleLabel,
  formatVehicleTitle,
  getVehicleTypeMeta,
} from "../Utils/vehicleDisplayUtils";

export { formatVehicleLabel, formatVehicleTitle, getVehicleTypeMeta };

export const VehicleTypeBadge = ({ type, size = "md", style }) => {
  const styles = useThemedStyles(createStyles);
  const meta = getVehicleTypeMeta(type);
  if (!meta.label) return null;
  const compact = size === "sm";
  return (
    <View
      style={[
        styles.typeBadge,
        compact && styles.typeBadgeSm,
        { backgroundColor: meta.bg },
        style,
      ]}
    >
      <Icon name={meta.icon} size={compact ? 12 : 14} color={meta.color} />
      <Text style={[styles.typeBadgeText, compact && styles.typeBadgeTextSm, { color: meta.color }]}>
        {meta.label}
      </Text>
    </View>
  );
};

/**
 * Compact vehicle row for upcoming ride cards.
 */
export const VehicleInlineBar = ({ vehicle }) => {
  const styles = useThemedStyles(createStyles);
  if (!vehicle) return null;

  const title = formatVehicleTitle(vehicle);
  const plate = String(vehicle.car_no || "").trim();
  const meta = getVehicleTypeMeta(vehicle.type);
  if (!title && !plate && !meta.label) return null;

  return (
    <View style={styles.inlineBar}>
      <VehicleTypeBadge type={vehicle.type} size="sm" />
      <View style={styles.inlineTextCol}>
        {title ? (
          <Text style={styles.inlineTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {plate ? (
          <Text style={styles.inlinePlate} numberOfLines={1}>
            {plate}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/**
 * Vehicle summary with optional photo — tap image for full-screen preview.
 */
const VehicleInfoStrip = ({ vehicle, compact = false, variant = "card" }) => {
  const styles = useThemedStyles(createStyles);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!vehicle) return null;

  if (variant === "inline") {
    return <VehicleInlineBar vehicle={vehicle} />;
  }

  const title = formatVehicleTitle(vehicle);
  const label = formatVehicleLabel(vehicle);
  const plate = String(vehicle.car_no || "").trim();
  const imageUri = vehicle.car_image;
  const meta = getVehicleTypeMeta(vehicle.type);

  if (!title && !plate && !imageUri && !meta.label) return null;

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
      {meta.label ? (
        <View style={[styles.imageTypeBadge, { backgroundColor: meta.bg }]}>
          <Icon name={meta.icon} size={11} color={meta.color} />
        </View>
      ) : null}
    </Pressable>
  ) : (
    <View style={[styles.imagePlaceholder, compact && styles.imageCompact]}>
      <Icon name={meta.icon || "car-outline"} size={compact ? 22 : 28} color={meta.color} />
      {meta.label ? (
        <View style={[styles.placeholderTypeBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.placeholderTypeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        {imageBlock}
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Vehicle</Text>
            <VehicleTypeBadge type={vehicle.type} size="sm" />
          </View>
          {title ? (
            <Text style={styles.makeModel} numberOfLines={2}>
              {title}
            </Text>
          ) : label ? (
            <Text style={styles.makeModel} numberOfLines={2}>
              {label}
            </Text>
          ) : null}
          {plate ? (
            <View style={styles.plateChip}>
              <Text style={styles.platePrefix}>IND</Text>
              <Text style={styles.plateText}>{plate}</Text>
            </View>
          ) : null}
          {imageUri ? (
            <Text style={styles.tapHint}>Tap photo to view full size</Text>
          ) : null}
        </View>
      </View>

      <ImagePreviewModal
        visible={previewOpen}
        source={imageUri}
        title={title || label || "Vehicle"}
        subtitle={plate ? `Reg: ${plate}` : meta.label || undefined}
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
    },
    wrapCompact: {
      padding: 10,
    },
    image: {
      width: 96,
      height: 72,
      borderRadius: 12,
      backgroundColor: c.chipBg,
    },
    imageCompact: {
      width: 76,
      height: 58,
      borderRadius: 10,
    },
    imagePressed: {
      opacity: 0.85,
    },
    imageTypeBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.85)",
    },
    imagePlaceholder: {
      width: 96,
      height: 72,
      borderRadius: 12,
      backgroundColor: c.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderTypeBadge: {
      position: "absolute",
      bottom: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    placeholderTypeText: {
      fontSize: 10,
      fontWeight: "800",
    },
    placeholderIcon: {
      width: 28,
      height: 28,
      opacity: 0.7,
    },
    textCol: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 4,
    },
    title: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    makeModel: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      lineHeight: 20,
    },
    plateChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      marginTop: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      gap: 6,
    },
    platePrefix: {
      fontSize: 10,
      fontWeight: "800",
      color: c.textMuted,
    },
    plateText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
      letterSpacing: 0.6,
    },
    tapHint: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 6,
    },
    typeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    typeBadgeSm: {
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: "800",
    },
    typeBadgeTextSm: {
      fontSize: 10,
    },
    inlineBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    inlineTextCol: {
      flex: 1,
      minWidth: 0,
    },
    inlineTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
    inlinePlate: {
      fontSize: 10,
      fontWeight: "600",
      color: c.textMuted,
      marginTop: 2,
      letterSpacing: 0.4,
    },
  });
