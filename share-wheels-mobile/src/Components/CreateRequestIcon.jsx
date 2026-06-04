import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { navigateToRootScreen } from "../Utils/mainTabNavigation";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import CoachMarkAnchor from "./coachMarks/CoachMarkAnchor";

import rideIcon from "../assets/ride.png";
import passengerIcon from "../assets/passenger.png";
import couriericon from "../assets/couriericon.png";
import { LAYOUT, scale } from "../theme/layout";

const CREATE_OPTIONS = [
  {
    key: "ride",
    icon: rideIcon,
    tintKey: "tintBlue",
    title: "Ride",
    subtitle: "Create a ride as a driver",
    screen: "CreateRide",
  },
  {
    key: "passenger",
    icon: passengerIcon,
    tintKey: "tintGreen",
    title: "Passenger Request",
    subtitle: "Join as a passenger",
    screen: "PassengerRequest",
  },
  {
    key: "courier",
    icon: couriericon,
    tintKey: "tintOrange",
    title: "Courier Request",
    subtitle: "Send a package",
    screen: "CourierRequest",
  },
];

const CreateOptionsCard = ({ visible: fabEnabled = true }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);

  const options = useMemo(
    () =>
      CREATE_OPTIONS.map((o) => ({
        ...o,
        bg: colors[o.tintKey] || colors.surfaceAlt,
      })),
    [colors]
  );

  useEffect(() => {
    if (!fabEnabled) setVisible(false);
  }, [fabEnabled]);

  return (
    <View style={styles.host} pointerEvents="box-none">
      {visible && (
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setVisible(false)}
        />
      )}

      {visible && (
        <View style={styles.card}>
          {options.map((opt) => (
            <Option
              key={opt.key}
              icon={opt.icon}
              bg={opt.bg}
              title={opt.title}
              subtitle={opt.subtitle}
              styles={styles}
              onPress={() => {
                setVisible(false);
                navigateToRootScreen(navigation, opt.screen);
              }}
            />
          ))}
        </View>
      )}

      <CoachMarkAnchor id="fab_create" style={styles.fabAnchor}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }, !fabEnabled && styles.fabDisabled]}
          onPress={() => fabEnabled && setVisible(!visible)}
          activeOpacity={0.8}
          disabled={!fabEnabled}
        >
          <Text style={styles.plus}>+</Text>
        </TouchableOpacity>
      </CoachMarkAnchor>
    </View>
  );
};

const Option = ({ icon, title, subtitle, bg, onPress, styles }) => (
  <TouchableOpacity
    style={[styles.option, { backgroundColor: bg }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.iconWrap}>
      <Image source={icon} style={styles.icon} />
    </View>
    <View style={styles.optionTextCol}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

export default CreateOptionsCard;

const createStyles = (c) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    host: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      position: "absolute",
      bottom: scale(72),
      right: scale(20),
      width: 280,
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 10,
      borderWidth: 1,
      borderColor: c.border,
      elevation: 10,
      shadowColor: c.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 14,
      marginBottom: 10,
    },
    iconWrap: {
      width: 46,
      height: 46,
      marginRight: 10,
      elevation: 2,
    },
    icon: {
      width: 46,
      height: 46,
      resizeMode: "contain",
    },
    optionTextCol: { flex: 1 },
    title: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    sub: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    fabAnchor: {
      position: "absolute",
      bottom: 0,
      right: scale(20),
    },
    fab: {
      width: LAYOUT.sizes.fabSize,
      height: LAYOUT.sizes.fabSize,
      borderRadius: LAYOUT.sizes.fabSize / 2,
      justifyContent: "center",
      alignItems: "center",
      elevation: 6,
    },
    plus: {
      fontSize: scale(28),
      color: c.inverseText,
      lineHeight: scale(28),
    },
    fabDisabled: {
      opacity: 0,
    },
  });
