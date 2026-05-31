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
  Switch,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  launchImageLibrary,
  launchCamera,
} from "react-native-image-picker";

import PersonalInformationCard from "../Components/PersonalInformationCard";
import Supportcard from "../Components/Supportcard";
import FeedbackCard from "../Components/FeedbackCard";
import LegalIcon from "../assets/legal.png";


import { useNavigation } from "@react-navigation/native";
import profilepageicon from "../assets/profilepageicon.jpg";
import { profileData } from "../Navigation/AuthNavigator";
import KeyboardAwareScreen from "./ui/KeyboardAwareScreen";
import ScreenContainer from "./ui/ScreenContainer";
import AdPlacement from "./ads/AdPlacement";
import { useAds } from "../context/AdsContext";
import { useFocusEffect } from "@react-navigation/native";
import { LAYOUT, scale } from "../theme/layout";
import Icon from "react-native-vector-icons/Ionicons";
import { AUTH_COLORS } from "../theme/authTheme";
import { uploadAndSetProfileImage } from "../ApiService/imageApiService";
import { userProfile } from "../ApiService/ridesApiServices";
import { isRemoteImageUrl } from "../Utils/imageUpload";
import { useTheme } from "../context/ThemeContext";

const MyProfile = () => {
  const { ProfileDetails, SetProfileDetails, logout } = profileData();
  const navigation = useNavigation();
  const { refreshAds } = useAds();
  const { isDark, colors, toggleTheme } = useTheme();
  const themedStyles = React.useMemo(() => createStyles(colors), [colors]);

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
    <ScreenContainer backgroundColor={colors.background} edges={["top"]}>
    <KeyboardAwareScreen style={themedStyles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: LAYOUT.spacing.xl + 80 }}
      >
        <LinearGradient
          colors={colors.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={themedStyles.profileHero}
        >
          <Text style={themedStyles.heroLabel}>My profile</Text>
          <View style={themedStyles.topRow}>
            <View style={themedStyles.avatarWrapper}>
              <TouchableOpacity onPress={openImage} activeOpacity={0.9}>
                <Image source={imageSource} style={themedStyles.avatar} />
              </TouchableOpacity>
              <TouchableOpacity
                style={themedStyles.editBtn}
                onPress={pickImage}
                disabled={uploadingPhoto}
              >
                <Icon name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={themedStyles.nameBlock}>
              <Text style={themedStyles.name}>{personal?.name || "User"}</Text>
              {personal?.userNo ? (
                <Text style={themedStyles.userNo}>ID · {personal.userNo}</Text>
              ) : null}
              <Text style={themedStyles.email} numberOfLines={1}>
                {personal?.email || personal?.phoneNumber || "—"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={themedStyles.sectionHeading}>Appearance</Text>
        <View style={themedStyles.menuCard}>
          <View style={themedStyles.menuRow}>
            <View style={[themedStyles.menuIcon, { backgroundColor: colors.primaryMuted }]}>
              <Icon
                name={isDark ? "moon" : "sunny"}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={themedStyles.themeTextCol}>
              <Text style={themedStyles.menuTitle}>Dark theme</Text>
              <Text style={themedStyles.themeSub}>
                {isDark ? "On — easier on the eyes at night" : "Off — light background"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#CBD5E1", true: colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Toggle dark theme"
            />
          </View>
        </View>

        <Text style={themedStyles.sectionHeading}>Account details</Text>
        <PersonalInformationCard personal={personal} vehicle={vehicle} />

        <Text style={themedStyles.sectionHeading}>Feedback</Text>
        <FeedbackCard />

        <Text style={themedStyles.sectionHeading}>Support</Text>
        <Supportcard />

        <Text style={themedStyles.sectionHeading}>More</Text>
        <View style={themedStyles.menuCard}>
          <TouchableOpacity
            style={themedStyles.menuRow}
            onPress={() => navigation.navigate("Legal")}
            activeOpacity={0.85}
          >
            <View style={[themedStyles.menuIcon, { backgroundColor: colors.primaryMuted }]}>
              <Image source={LegalIcon} style={themedStyles.menuIconImg} />
            </View>
            <Text style={themedStyles.menuTitle}>Legal</Text>
            <Icon name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <AdPlacement placement="profile" />

        <TouchableOpacity
          style={themedStyles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={themedStyles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* IMAGE PREVIEW MODAL */}
      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeImage}>
          <View style={themedStyles.modalContainer}>
            <Animated.Image
              source={imageSource}
              style={[
                themedStyles.fullImage,
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

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  profileHero: {
    marginHorizontal: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.lg,
    overflow: "hidden",
  },

  heroLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: LAYOUT.spacing.md,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrapper: {
    width: LAYOUT.sizes.avatarLg + 12,
    height: LAYOUT.sizes.avatarLg + 12,
    marginRight: LAYOUT.spacing.md,
  },

  avatar: {
    width: LAYOUT.sizes.avatarLg + 12,
    height: LAYOUT.sizes.avatarLg + 12,
    borderRadius: (LAYOUT.sizes.avatarLg + 12) / 2,
    borderColor: "rgba(255,255,255,0.9)",
    borderWidth: 3,
  },

  editBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1D4ED8",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  nameBlock: {
    flex: 1,
  },

  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },

  userNo: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontWeight: "600",
  },

  email: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
  },

  themeTextCol: {
    flex: 1,
    marginRight: 8,
  },
  themeSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginLeft: LAYOUT.spacing.md + 4,
    marginTop: LAYOUT.spacing.lg,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
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

  menuCard: {
    backgroundColor: colors.card,
    marginHorizontal: LAYOUT.spacing.md,
    marginTop: 4,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: LAYOUT.spacing.md,
  },

  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  menuIconImg: {
    width: 22,
    height: 22,
    tintColor: "#2563EB",
  },

  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
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