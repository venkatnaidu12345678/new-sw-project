import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const NotificationIcon = () => {
  const navigation = useNavigation();
  const [showMenu, setShowMenu] = useState(false);

  const handleNotificationPress = () => {
    setShowMenu(!showMenu); // toggle dropdown
  };

  const goToMessages = () => {
    setShowMenu(false);
    navigation.navigate("MessagesScreen");
  };

  const goToNotifications = () => {
    setShowMenu(false);
    navigation.navigate("NotificationScreen");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleNotificationPress}>
        <Image
          source={require("../assets/notification.png")}
          style={styles.icon}
        />
      </TouchableOpacity>

      {showMenu && (
        <View style={styles.dropdown}>
          <TouchableOpacity style={styles.item} onPress={goToMessages}>
            <Text style={styles.text}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={goToNotifications}>
            <Text style={styles.text}>Notifications</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default NotificationIcon;

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginTop: 30,
    alignSelf: "flex-start",
  },
  icon: {
    width: 28,
    height: 28,
  },
  dropdown: {
    position: "absolute",
    top: 35,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 5,
    width: 160,

    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex:1000,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  text: {
    fontSize: 14,
  },
});