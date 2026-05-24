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

import ProfileImage from "../assets/Profiledashboard.png";

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

  const imageSource = user?.userimg
    ? { uri: user.userimg }
    : ProfileImage;

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.container}
        
        activeOpacity={0.7}
      >
        
        {/* 👇 IMAGE CLICK */}
        <TouchableOpacity onPress={openImage}>
          <Image source={imageSource} style={styles.avatar} />
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
              source={imageSource}
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
    paddingTop: 20,
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
    fontSize: 16,
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