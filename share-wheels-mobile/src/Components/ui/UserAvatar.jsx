import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { getProfileImageUri } from "../../Utils/profileImage";
import defaultAvatar from "../../assets/profile.png";

/**
 * Shows Cloudinary profile photo or default avatar.
 * @param {object|string|null} user - User doc, { profile_img }, or URL string
 */
import { LAYOUT } from "../../theme/layout";

const UserAvatar = ({
  user,
  size = LAYOUT.sizes.avatarMd,
  style,
  imageStyle,
  borderColor = "#E2E8F0",
}) => {
  const uri = getProfileImageUri(user);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={[
        styles.wrap,
        dimension,
        { borderColor },
        style,
      ]}
    >
      <Image
        source={uri ? { uri } : defaultAvatar}
        style={[styles.image, dimension, imageStyle]}
        resizeMode="cover"
      />
    </View>
  );
};

export default UserAvatar;

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "#F1F5F9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
