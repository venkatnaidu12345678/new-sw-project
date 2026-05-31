import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import UserAvatar from "./ui/UserAvatar";
import { getProfileImageUri } from "../Utils/profileImage";
import defaultAvatar from "../assets/profile.jpg";
import { LAYOUT } from "../theme/layout";

const HeaderImage = (props) => {
  const user = props.user;

  const [firstName, setFirstName] = useState("User");
  const [visible, setVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserName();
  }, []);

  const loadUserName = async () => {
    const fullName = await AsyncStorage.getItem("USER_NAME");
    if (fullName) {
      setFirstName(fullName.trim().split(" ")[0]);
    }
  };

  

  // 🔥 Open animation
  const openImage = () => {
    setVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // 🔥 Close animation
  const closeImage = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const profileUser = user;
  const profileUri = getProfileImageUri(profileUser);

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.container}
        
        activeOpacity={0.7}
      >
        
        {/* 👇 IMAGE CLICK */}
        <TouchableOpacity onPress={openImage}>
          <UserAvatar
            user={profileUser}
            size={LAYOUT.sizes.headerAvatar}
            borderColor="#80b1e9"
          />
        </TouchableOpacity>

        <Text style={styles.text} numberOfLines={1}>
          Hello, {user?.name || firstName}!
        </Text>
        </View>
      

      {/* 🔥 FULL SCREEN PREVIEW */}
      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeImage}>
          <View style={styles.modalContainer}>
            <Animated.Image
              source={profileUri ? { uri: profileUri } : defaultAvatar}
              style={[
                styles.fullImage,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default HeaderImage;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 50,
    marginRight: 10,
    borderColor: "#80b1e9",
    borderWidth: 3,
  },
  text: {
    fontSize: LAYOUT.font.body,
    fontWeight: "600",
    color: "#222",
    maxWidth: 220,
  },

  // 🔥 Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "90%",
    height: "70%",
    borderRadius: 10,
  },
});