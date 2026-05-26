import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import RemoteImage from "./ui/RemoteImage";
import caricon from "../assets/caricon.png";
import { LAYOUT } from "../theme/layout";

export const formatVehicleLabel = (vehicle) => {
  if (!vehicle) return "";
  const parts = [vehicle.type, vehicle.company, vehicle.model]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean);
  return parts.join(" · ");
};

/**
 * Vehicle summary with optional photo — for passengers/couriers viewing driver vehicle.
 */
const VehicleInfoStrip = ({ vehicle, compact = false }) => {
  if (!vehicle) return null;

  const label = formatVehicleLabel(vehicle);
  const plate = vehicle.car_no?.trim?.();
  const imageUri = vehicle.car_image;

  if (!label && !plate && !imageUri) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {imageUri ? (
        <RemoteImage
          source={imageUri}
          style={[styles.image, compact && styles.imageCompact]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, compact && styles.imageCompact]}>
          <Image source={caricon} style={styles.placeholderIcon} />
        </View>
      )}
      <View style={styles.textCol}>
        <Text style={styles.title}>Vehicle</Text>
        {label ? (
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        ) : null}
        {plate ? (
          <Text style={styles.plate}>Reg: {plate}</Text>
        ) : null}
      </View>
    </View>
  );
};

export default VehicleInfoStrip;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: LAYOUT.radius?.md || 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
  },
  wrapCompact: {
    padding: 10,
  },
  image: {
    width: 88,
    height: 66,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  imageCompact: {
    width: 72,
    height: 54,
  },
  imagePlaceholder: {
    width: 88,
    height: 66,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
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
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  plate: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
});
