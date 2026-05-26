import React, { useState, useRef, useEffect, useCallback } from "react";
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
import KeyboardAwareScreen from "./ui/KeyboardAwareScreen";
import ScreenContainer from "./ui/ScreenContainer";
import AdPlacement from "./ads/AdPlacement";
import { useAds } from "../context/AdsContext";
import { useFocusEffect } from "@react-navigation/native";
import { LAYOUT, scale } from "../theme/layout";
import { uploadAndSetProfileImage } from "../ApiService/imageApiService";
import { userProfile } from "../ApiService/ridesApiServices";
import { isRemoteImageUrl } from "../Utils/imageUpload";

const MyProfile = () => {
  const { ProfileDetails, SetProfileDetails, logout } = profileData();
  const navigation = useNavigation();
  const { refreshAds } = useAds();

  useFocusEffect(
    useCallback(() => {
      refreshAds();
    }, [refreshAds])
  );

  const personal = ProfileDetails?.data?.personalInfo;
  const vehicle = ProfileDetails?.data?.vehicleInfo;

  // 🔥 Image states
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // ✅ Load saved image
  useEffect(() => {
    loadSavedImage();
  }, []);

  const loadSavedImage = async () => {
    if (personal?.userimg && isRemoteImageUrl(personal.userimg)) {
      setProfileImage(personal.userimg);
      return;
    }
    const img = await AsyncStorage.getItem("PROFILE_IMAGE");
    if (img) setProfileImage(img);
  };

  useEffect(() => {
    if (personal?.userimg) loadSavedImage();
  }, [personal?.userimg]);

  const imageSource = profileImage
    ? { uri: profileImage }
    : personal?.userimg
    ? { uri: personal.userimg }
    : profilepageicon;

  const persistProfilePhoto = async (asset) => {
    if (!asset?.uri) return;
    setProfileImage(asset.uri);
    setUploadingPhoto(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Not logged in");
      const file = {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || "profile.jpg",
      };
      const result = await uploadAndSetProfileImage(token, file);
      const url = result?.profile_img;
      if (url) {
        setProfileImage(url);
        await AsyncStorage.setItem("PROFILE_IMAGE", url);
      }
      const profile = await userProfile(token);
      if (profile?.data) SetProfileDetails(profile);
    } catch (err) {
      Alert.alert("Upload failed", err?.message || "Could not upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

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

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            if (logout) await logout();
          } catch (e) {
            Alert.alert("Error", e?.message || "Could not log out");
          }
        },
      },
    ]);
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
      await persistProfilePhoto(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
      includeBase64: false,
    });

    if (!result.didCancel && result.assets?.length > 0) {
      await persistProfilePhoto(result.assets[0]);
    }
  };

  return (
    <ScreenContainer backgroundColor="#F3F4F6" edges={["top"]}>
    <KeyboardAwareScreen style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: LAYOUT.spacing.xl + 80 }}
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
              <TouchableOpacity
                style={styles.editBtn}
                onPress={pickImage}
                disabled={uploadingPhoto}
              >
                <Text style={styles.editText}>{uploadingPhoto ? "…" : "✏️"}</Text>
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

        <AdPlacement placement="profile" />

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* IMAGE PREVIEW MODAL */}
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
    </KeyboardAwareScreen>
    </ScreenContainer>
  );
};

export default MyProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  profileCard: {
    margin: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.screen,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrapper: {
    width: LAYOUT.sizes.avatarLg + 8,
    height: LAYOUT.sizes.avatarLg + 8,
    marginRight: LAYOUT.spacing.md,
  },

  avatar: {
    width: LAYOUT.sizes.avatarLg + 8,
    height: LAYOUT.sizes.avatarLg + 8,
    borderRadius: (LAYOUT.sizes.avatarLg + 8) / 2,
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

  logoutBtn: {
    marginHorizontal: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.lg,
    marginBottom: LAYOUT.spacing.xl,
    backgroundColor: "#FEE2E2",
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: LAYOUT.spacing.md,
    alignItems: "center",
  },

  logoutText: {
    color: "#DC2626",
    fontSize: LAYOUT.font.body,
    fontWeight: "700",
  },
});