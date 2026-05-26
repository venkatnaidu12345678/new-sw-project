import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const NotificationIcon = ({ variant = "default" }) => {
  const isLight = variant === "light";
  const navigation = useNavigation();
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
          onPress={() => setShowMenu(true)}
          style={[styles.iconBtn, isLight && styles.iconBtnLight]}
        >
          <Image
            source={require("../assets/notification.png")}
            style={[styles.icon, isLight && styles.iconLight]}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.overlay}>
            <Pressable
              style={[styles.dropdown, isLight ? styles.dropdownOnDark : null]}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity style={styles.item} onPress={goToMessages}>
                <Text style={styles.itemIcon}>💬</Text>
                <Text style={styles.itemText}>Messages</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.item} onPress={goToNotifications}>
                <Text style={styles.itemIcon}>🔔</Text>
                <Text style={styles.itemText}>Notifications</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 16,
  },
  dropdown: {
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
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 8,
  },
});
