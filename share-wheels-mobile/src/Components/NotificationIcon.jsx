import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useNotifications } from "../context/NotificationsContext";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const OVERLAY_VARIANTS = {
  dashboard: {
    icon: "notifications",
    color: "#FFFFFF",
    bg: "rgba(255,255,255,0.22)",
    border: "rgba(255,255,255,0.45)",
  },
  light: {
    icon: "notifications",
    color: "#FBBF24",
    bg: "rgba(255,255,255,0.28)",
    border: "rgba(255,255,255,0.5)",
  },
};

const NotificationIcon = ({ variant = "default" }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { unreadCount = 0 } = useNotifications() || {};
  const hasUnread = unreadCount > 0;

  const theme = useMemo(() => {
    if (OVERLAY_VARIANTS[variant]) return OVERLAY_VARIANTS[variant];
    return {
      icon: "notifications",
      color: colors.primary,
      bg: colors.surfaceAlt,
      border: colors.border,
    };
  }, [variant, colors.primary, colors.surfaceAlt, colors.border]);

  const openNotifications = () => {
    navigation.navigate("NotificationScreen");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={openNotifications}
        style={[
          styles.iconBtn,
          { backgroundColor: theme.bg, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={
          hasUnread
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <Icon name={theme.icon} size={24} color={theme.color} />
        {hasUnread ? (
          <LinearGradient colors={["#EF4444", "#F97316"]} style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </LinearGradient>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

export default NotificationIcon;

const createStyles = (c) =>
  StyleSheet.create({
    container: {
      position: "relative",
      zIndex: 100,
      elevation: 100,
    },
    iconBtn: {
      padding: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: -2,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: c.surface,
    },
    badgeText: {
      color: "#fff",
      fontSize: 9,
      fontWeight: "800",
    },
  });
