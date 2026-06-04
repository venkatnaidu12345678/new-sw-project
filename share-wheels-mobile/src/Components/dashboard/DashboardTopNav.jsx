import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import UserAvatar from "../ui/UserAvatar";
import NotificationIcon from "../NotificationIcon";
import CoachMarkAnchor from "../coachMarks/CoachMarkAnchor";
import { LAYOUT } from "../../theme/layout";

const GRADIENT = ["#2563EB", "#4F46E5", "#7C3AED"];

const DashboardTopNav = ({ user }) => {
  const navigation = useNavigation();
  const displayName = user?.name?.trim()?.split(" ")?.[0] || "there";

  const goToProfile = () => {
    const tabNav = navigation.getParent();
    if (tabNav?.navigate) {
      tabNav.navigate("Profile");
    }
  };

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.inner}>
        <Pressable style={styles.left} onPress={goToProfile} accessibilityRole="button">
          <UserAvatar user={user} size={44} borderColor="rgba(255,255,255,0.85)" />
          <View style={styles.textCol}>
            <Text style={styles.greeting}>Hello, {displayName}</Text>
            <Text style={styles.sub}>Where are you headed?</Text>
          </View>
        </Pressable>
        <CoachMarkAnchor id="home_notifications">
          <NotificationIcon variant="dashboard" />
        </CoachMarkAnchor>
      </View>
    </LinearGradient>
  );
};

export default DashboardTopNav;

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingTop: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.md + 2,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: LAYOUT.spacing.sm,
  },
  textCol: {
    marginLeft: LAYOUT.spacing.md,
    flex: 1,
  },
  greeting: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sub: {
    fontSize: LAYOUT.font.small,
    color: "rgba(255,255,255,0.88)",
    marginTop: 2,
  },
});
