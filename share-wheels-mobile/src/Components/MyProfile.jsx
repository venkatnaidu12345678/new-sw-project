import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  launchImageLibrary,
  launchCamera,
} from "react-native-image-picker";

import RatingCard from "../Components/RatingCard";
import PersonalInformationCard from "../Components/PersonalInformationCard";
import Supportcard from "../Components/Supportcard";
import LegalIcon from "../assets/legal.png";


import { useNavigation } from "@react-navigation/native";
import profilepageicon from "../assets/profilepageicon.png";
import { profileData } from "../Navigation/AuthNavigator";

const MyProfile = () => {
  const { ProfileDetails } = profileData();
  const navigation = useNavigation();

  const personal = ProfileDetails?.data?.personalInfo;
  const vehicle = ProfileDetails?.data?.vehicleInfo;

  // 🔥 Image states
  const [profileImage, setProfileImage] = useState(null);
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // ✅ Load saved image
  useEffect(() => {
    loadSavedImage();
  }, []);

  const loadSavedImage = async () => {
    const img = await AsyncStorage.getItem("PROFILE_IMAGE");
    if (img) setProfileImage(img);
  };

  // ✅ Final image source
  const imageSource = profileImage
    ? { uri: profileImage }
    : personal?.userimg
    ? { uri: personal.userimg }
    : profilepageicon;

  // 🔥 Preview animation
  const openImage = () => {
    setVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const closeImage = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  // 🔥 Image picker
  const pickImage = () => {
    Alert.alert("Upload Image", "Choose an option", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: openGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    const result = await launchCamera({
      mediaType: "photo",
      quality: 0.8,
    });

    if (!result.didCancel && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem("PROFILE_IMAGE", uri);
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
    });

    if (!result.didCancel && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem("PROFILE_IMAGE", uri);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* 🔷 PROFILE CARD */}
        <LinearGradient
          colors={["#2563EB", "#1D4ED8"]}
          style={styles.profileCard}
        >
          <View style={styles.topRow}>
            <View style={styles.avatarWrapper}>
              {/* 👇 CLICK IMAGE */}
              <TouchableOpacity onPress={openImage}>
                <Image source={imageSource} style={styles.avatar} />
              </TouchableOpacity>

              {/* ✏️ EDIT BUTTON */}
              <TouchableOpacity style={styles.editBtn} onPress={pickImage}>
                <Text style={styles.editText}>✏️</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {personal?.name || "User"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 👤 PERSONAL INFO */}
        <PersonalInformationCard
          personal={personal}
          vehicle={vehicle}
        />

        {/* 🆘 Support */}
        <Supportcard />

        {/* ⚖️ LEGAL */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("Legal")}
          >
            <View style={styles.iconWrapper}>
              <Image source={LegalIcon} style={styles.icon} />
            </View>
            <Text style={styles.title}>Legal</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 🔥 IMAGE PREVIEW MODAL */}
      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeImage}>
          <View style={styles.modalContainer}>
            <Animated.Image
              source={imageSource}
              style={[
                styles.fullImage,
                { transform: [{ scale: scaleAnim }] },
              ]}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default MyProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop: 40,
    marginBottom:60,
  },

  profileCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrapper: {
    width: 80,
    height: 80,
    marginRight: 14,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 50,
    borderColor: "#fff",
    borderWidth: 2,
    elevation: 6,
  },

  editBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563EB",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  editText: {
    color: "#fff",
    fontSize: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 10,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },

  fullImage: {
    width: "90%",
    height: "70%",
    borderRadius: 12,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    elevation: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  icon: {
    width: 20,
    height: 20,
    tintColor: "#2563EB",
  },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },

  arrow: {
    fontSize: 20,
    color: "#9CA3AF",
  },
});