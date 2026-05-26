import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { AUTH_COLORS } from "../../theme/authTheme";
import NotificationIcon from "../NotificationIcon";
import UserAvatar from "../ui/UserAvatar";
import appIcon from "../../assets/icon.png";
import { LAYOUT, scale } from "../../theme/layout";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Fixed dashboard header with gradient — does not scroll.
 */
const DashboardTopNav = ({ user }) => {
  const navigation = useNavigation();
  const firstName = user?.name?.trim()?.split(" ")?.[0] || "there";

  return (
    <View style={styles.outer}>
    <LinearGradient
      colors={["#0F172A", AUTH_COLORS.primaryDark, AUTH_COLORS.primary, "#38BDF8"]}
      locations={[0, 0.38, 0.72, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.logoGlow}>
            <Image source={appIcon} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>Share Wheels</Text>
        </View>

        <View style={styles.right}>
          <NotificationIcon variant="light" />
          <TouchableOpacity
            style={styles.avatarTap}
            onPress={() => navigation.navigate("Navigator", { screen: "Profile" })}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <UserAvatar
              user={user}
              size={scale(40)}
              borderColor="rgba(255,255,255,0.9)"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.greeting} numberOfLines={1}>
        {getGreeting()}, {firstName}
      </Text>
    </LinearGradient>
    </View>
  );
};

export default DashboardTopNav;

const styles = StyleSheet.create({
  outer: {
    zIndex: 200,
    elevation: 200,
  },
  gradient: {
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.lg,
    borderBottomLeftRadius: LAYOUT.radius.xl,
    borderBottomRightRadius: LAYOUT.radius.xl,
    marginBottom: LAYOUT.spacing.md,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoGlow: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: LAYOUT.spacing.sm,
  },
  logo: {
    width: scale(28),
    height: scale(28),
  },
  appName: {
    fontSize: LAYOUT.font.title,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarTap: {
    marginLeft: LAYOUT.spacing.xs,
  },
  greeting: {
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.font.body,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
  },
});
