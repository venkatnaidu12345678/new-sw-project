import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import VehicleInfoStrip from "./VehicleInfoStrip";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { DS } from "../theme/designSystem";

const mapProfileVehicle = (info) => ({
  type: info?.vehicleType || info?.type || "",
  company: info?.vehicleCompany || "",
  model: info?.vehicleModel || "",
  car_no: info?.carNo || "",
  car_image: info?.carImage || "",
});

const VehicleInfo = ({ vehicleInfo, onPressAdd }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const vehicle = useMemo(() => mapProfileVehicle(vehicleInfo), [vehicleInfo]);
  const hasVehicle = !!(vehicle.company?.trim() && vehicle.model?.trim());

  if (!hasVehicle) {
    return (
      <Pressable
        style={({ pressed }) => [styles.emptyCard, pressed && styles.pressed]}
        onPress={onPressAdd}
        accessibilityRole="button"
        accessibilityLabel="Add your vehicle"
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
          <Icon name="car-sport-outline" size={26} color={colors.primary} />
        </View>
        <View style={styles.emptyBody}>
          <Text style={styles.emptyTitle}>Add your vehicle</Text>
          <Text style={styles.emptySubtitle}>
            Required once — then you can publish rides anytime
          </Text>
        </View>
        <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name="add" size={20} color="#FFFFFF" />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.filledWrap}>
      <View style={styles.filledHeader}>
        <View style={styles.readyRow}>
          <Icon name="checkmark-circle" size={17} color={colors.successText} />
          <Text style={[styles.readyText, { color: colors.successText }]}>
            Vehicle saved
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onPressAdd}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="create-outline" size={15} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>
      <VehicleInfoStrip vehicle={vehicle} compact />
    </View>
  );
};

export default VehicleInfo;

const createStyles = (c) =>
  StyleSheet.create({
    emptyCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: DS.spacing.md,
      padding: DS.spacing.md,
      borderRadius: DS.radius.lg,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: c.primary,
      backgroundColor: c.primaryMuted,
    },
    pressed: {
      opacity: 0.92,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyBody: {
      flex: 1,
      minWidth: 0,
    },
    emptyTitle: {
      fontSize: DS.font.body,
      fontWeight: "700",
      color: c.text,
    },
    emptySubtitle: {
      fontSize: DS.font.small,
      color: c.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    filledWrap: {
      gap: DS.spacing.sm,
    },
    filledHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    readyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    readyText: {
      fontSize: DS.font.small,
      fontWeight: "700",
    },
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: DS.radius.sm,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    editBtnText: {
      fontSize: DS.font.small,
      fontWeight: "700",
    },
  });
