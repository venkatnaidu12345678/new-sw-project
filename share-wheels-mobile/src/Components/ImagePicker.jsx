import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { showImageSourcePicker } from "../Utils/imageUpload";

const EMPTY_IMAGES = { profile: null, license: null, courier: null };

const ImagePicker = ({ onChange, type = "all", resetKey = 0 }) => {
  const [images, setImages] = useState(EMPTY_IMAGES);

  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setImages(EMPTY_IMAGES);
    onChange?.(null);
  }, [resetKey]);

  const openPickerOptions = async (key) => {
    try {
      const file = await showImageSourcePicker(`${key}-${Date.now()}.jpg`);
      if (!file) return;

      const updatedImages = { ...images, [key]: file };
      setImages(updatedImages);

      if (type === "courier") {
        onChange?.(file);
      } else {
        onChange?.(updatedImages);
      }
    } catch (err) {
      Alert.alert("Image error", err?.message || "Could not select image");
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
