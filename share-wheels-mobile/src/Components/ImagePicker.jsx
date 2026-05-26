import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import {
  launchImageLibrary,
  launchCamera,
} from "react-native-image-picker";

const ImagePicker = ({ onChange, type = "all" }) => {
  const [images, setImages] = useState({
    profile: null,
    license: null,
    courier: null,
  });

  // 🔥 OPEN OPTIONS (Camera / Gallery)
  const openPickerOptions = (key) => {
    Alert.alert("Select Image", "Choose an option", [
      {
        text: "Camera",
        onPress: () => openCamera(key),
      },
      {
        text: "Gallery",
        onPress: () => openGallery(key),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const openCamera = (key) => {
    launchCamera(
      {
        mediaType: "photo",
        quality: 0.7,
        cameraType: "back",
      },
      handleResponse(key)
    );
  };

  const openGallery = (key) => {
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.7,
      },
      handleResponse(key)
    );
  };

  const handleResponse = (key) => (response) => {
    if (response.didCancel || response.errorCode) return;

    const asset = response.assets?.[0];
    if (!asset?.uri) return;

    const file = {
      uri: asset.uri,
      type: asset.type || "image/jpeg",
      name: asset.fileName || `${key}.jpg`,
    };

    const updatedImages = { ...images, [key]: file };
    setImages(updatedImages);

    if (type === "courier") {
      onChange?.(file);
    } else {
      onChange?.(updatedImages);
    }
  };

  const renderBox = (label, keyName) => (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.box}
        onPress={() => openPickerOptions(keyName)}
      >
        {images[keyName] ? (
          <Image
            source={{
              uri: images[keyName].uri || images[keyName],
            }}
            style={styles.image}
          />
        ) : (
          <Text style={styles.placeholder}>
            Tap to Upload (Camera / Gallery)
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      {type === "all" && (
        <>
          {renderBox("Profile Image", "profile")}
          {renderBox("Driving License", "license")}
        </>
      )}

      {(type === "all" || type === "courier") &&
        renderBox("Courier Image", "courier")}
    </View>
  );
};

export default ImagePicker;

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
    color: "#111827",
  },
  box: {
    width: "100%",
    height: 150,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  placeholder: {
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});