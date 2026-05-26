import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import ride from "../assets/ride.png";
import carimage from "../assets/nearbycar.png";
import { isRemoteImageUrl } from "../Utils/imageUpload";
import { AUTH_COLORS } from "../theme/authTheme";

const VehicleInfo = ({ vehicleInfo, userName, onPressAdd }) => {
  const company = vehicleInfo?.vehicleCompany?.trim();
  const model = vehicleInfo?.vehicleModel?.trim();
  const type = vehicleInfo?.vehicleType?.trim();
  const carPhoto = vehicleInfo?.carImage;
  const hasVehicle = !!(company && model);
  const carPhotoSource =
    carPhoto && isRemoteImageUrl(carPhoto) ? { uri: carPhoto } : carimage;

  if (!hasVehicle) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardEmpty]}
        onPress={onPressAdd}
        activeOpacity={0.85}
      >
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconWrap}>
            <Icon name="car-outline" size={28} color={AUTH_COLORS.primary} />
          </View>
          <View style={styles.emptyTextWrap}>
            <Text style={styles.emptyTitle}>Add your vehicle</Text>
            <Text style={styles.emptySubtitle}>
              Tap to add car details before creating a ride
            </Text>
          </View>
          <Icon name="chevron-forward" size={22} color={AUTH_COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  const ownerLabel = userName ? `${userName.split(" ")[0]}'s car` : "Your car";
  const subtitle = [model, type].filter(Boolean).join(" · ") || "Vehicle";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPressAdd}
      activeOpacity={0.9}
    >
      <View style={styles.left}>
        <View style={styles.parentVehicleinfo}>
          <View style={styles.caricon}>
            <Image source={ride} style={styles.rideIcon} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.owner} numberOfLines={1}>
              {ownerLabel}
            </Text>
            <Text style={styles.carName} numberOfLines={1}>
              {company} {model !== company ? model : ""}
            </Text>
            <Text style={styles.carInfo} numberOfLines={1}>
              {subtitle}
            </Text>
            <Text style={styles.tapHint}>Tap to update</Text>
          </View>
        </View>
      </View>
      <Image source={carPhotoSource} style={styles.image} resizeMode="cover" />
    </TouchableOpacity>
  );
};

export default VehicleInfo;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F6F8FF",
    borderWidth: 1,
    borderColor: "#DBDFFF",
    minHeight: 130,
    width: "100%",
    overflow: "hidden",
    marginBottom: 8,
  },
  cardEmpty: {
    backgroundColor: AUTH_COLORS.primaryLight,
    borderColor: "#BFDBFE",
    minHeight: 100,
  },
  emptyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AUTH_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTextWrap: { flex: 1 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AUTH_COLORS.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: AUTH_COLORS.textMuted,
    marginTop: 4,
  },
  left: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
  },
  parentVehicleinfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 12,
    paddingRight: 8,
  },
  textBlock: { flex: 1, minWidth: 0 },
  owner: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  carName: {
    fontSize: 13,
    fontWeight: "600",
    color: AUTH_COLORS.primary,
    marginTop: 2,
  },
  carInfo: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  tapHint: {
    fontSize: 11,
    color: AUTH_COLORS.textMuted,
    marginTop: 4,
  },
  image: {
    width: 120,
    height: 130,
  },
  rideIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  caricon: {
    marginTop: -4,
  },
});

