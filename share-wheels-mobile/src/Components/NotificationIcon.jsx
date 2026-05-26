import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  Pressable,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useNotifications } from "../context/NotificationsContext";

const GRADIENT = ["#2563EB", "#4F46E5", "#7C3AED"];

const VARIANTS = {
  default: {
    icon: "notifications",
    color: "#2563EB",
    bg: "#DBEAFE",
    border: "#93C5FD",
  },
  dashboard: {
    icon: "notifications",
    color: "#FBBF24",
    bg: "rgba(255,255,255,0.28)",
    border: "rgba(255,255,255,0.5)",
  },
  light: {
    icon: "notifications",
    color: "#FBBF24",
    bg: "rgba(255,255,255,0.28)",
    border: "rgba(255,255,255,0.5)",
  },
};

const NotificationIcon = ({ variant = "default" }) => {
  const theme = VARIANTS[variant] || VARIANTS.default;
  const navigation = useNavigation();
  const { unreadCount = 0 } = useNotifications() || {};
  const [showMenu, setShowMenu] = useState(false);

  const close = () => setShowMenu(false);

  const goToMessages = () => {
    close();
    navigation.navigate("MessagesScreen");
  };

  const goToNotifications = () => {
    close();
    navigation.navigate("NotificationScreen");
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => setShowMenu((v) => !v)}
          style={[
            styles.iconBtn,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
          activeOpacity={0.85}
        >
          <Icon name={theme.icon} size={24} color={theme.color} />
          {unreadCount > 0 ? (
            <LinearGradient colors={["#EF4444", "#F97316"]} style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </LinearGradient>
          ) : null}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
          <View style={styles.dropdown}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dropdownHeader}
            >
              <Text style={styles.dropdownTitle}>Inbox</Text>
            </LinearGradient>

            <TouchableOpacity style={styles.item} onPress={goToMessages}>
              <LinearGradient colors={["#2563EB", "#3B82F6"]} style={styles.itemIcon}>
                <Icon name="chatbubble-ellipses" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.itemText}>Messages</Text>
              <Icon name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.item} onPress={goToNotifications}>
              <LinearGradient colors={["#F59E0B", "#F97316"]} style={styles.itemIcon}>
                <Icon name="notifications" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.itemText}>Notifications</Text>
              {unreadCount > 0 ? (
                <LinearGradient colors={["#EF4444", "#F97316"]} style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </LinearGradient>
              ) : (
                <Icon name="chevron-forward" size={18} color="#94A3B8" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default NotificationIcon;

const styles = StyleSheet.create({
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
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  dropdown: {
    position: "absolute",
    top: 56,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    minWidth: 240,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  menuBadge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 12,
  },
});
