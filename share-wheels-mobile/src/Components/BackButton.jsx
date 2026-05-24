import React from "react";
import { TouchableOpacity, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

// Import your icon
import backIcon from "../assets/backicon.png";

const BackButton = ({ onPress, style, iconStyle }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress(); // custom action
    } else {
      navigation.goBack(); // default behavior
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.container, style]}>
      <Image source={backIcon} style={[styles.icon, iconStyle]} />
    </TouchableOpacity>
  );
};

export default BackButton;

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  icon: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
});