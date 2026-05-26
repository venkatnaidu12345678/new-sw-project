import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Modal,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useNotifications } from "../context/NotificationsContext";

const NotificationIcon = ({ variant = "default" }) => {
  const isLight = variant === "light";
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
      <View style={[styles.container, isLight && styles.containerLight]}>
        <TouchableOpacity
          onPress={() => setShowMenu((v) => !v)}
          style={[styles.iconBtn, isLight && styles.iconBtnLight]}
        >
          <Image
            source={require("../assets/notification.png")}
            style={[styles.icon, isLight && styles.iconLight]}
          />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
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
          <Pressable style={styles.backdrop} onPress={close} />
          <View
            style={[styles.dropdown, isLight ? styles.dropdownOnDark : null]}
            pointerEvents="box-none"
          >
            <TouchableOpacity style={styles.item} onPress={goToMessages}>
              <Text style={styles.itemIcon}>💬</Text>
              <Text style={styles.itemText}>Messages</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.item} onPress={goToNotifications}>
              <Text style={styles.itemIcon}>🔔</Text>
              <Text style={styles.itemText}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
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
  containerLight: {
    marginTop: 0,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  iconBtnLight: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  icon: {
    width: 26,
    height: 26,
  },
  iconLight: {
    tintColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdown: {
    position: "absolute",
    top: 56,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    zIndex: 10,
  },
  dropdownOnDark: {
    marginTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  menuBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
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
    marginHorizontal: 8,
  },
});
