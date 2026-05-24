import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";

import { launchImageLibrary } from "react-native-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AddVehicle } from "../ApiService/ridesApiServices";
import AppTextInput from "./ui/AppTextInput";

/* ✅ Reusable Base64 converter */
const convertImageToBase64 = async () => {
  return new Promise((resolve, reject) => {
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.5, // ✅ optimized
        includeBase64: true,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) return reject(response.errorMessage);

        const asset = response.assets?.[0];

        if (asset?.base64) {
          resolve(asset.base64);
        } else {
          reject("Base64 not available");
        }
      }
    );
  });
};

const AddVehicleModal = ({
  visible,
  onClose,
  onVehicleAdded,
  existingVehicle,
}) => {
  const [loading, setLoading] = useState(false);

  const [vehicleData, setVehicleData] = useState({
    company: "",
    model: "",
    type: "",
    license_number: "",
    car_image: "",
    issue_date: "",
    expiry_date: "",
    car_no: "",
  });

  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  useEffect(() => {
    if (existingVehicle) {
      setVehicleData(existingVehicle);
    }
  }, [existingVehicle]);

  const updateVehicle = (field, value) =>
    setVehicleData((prev) => ({ ...prev, [field]: value }));

  /* ✅ Image picker */
  const pickImage = async () => {
    try {
      const base64 = await convertImageToBase64();
      updateVehicle("car_image", base64);
    } catch (err) {
      Alert.alert("Error", "Image selection failed");
    }
  };

  const onIssueDateChange = (_, selectedDate) => {
    setShowIssuePicker(false);
    if (selectedDate) {
      updateVehicle(
        "issue_date",
        selectedDate.toISOString().split("T")[0]
      );
    }
  };

  const onExpiryDateChange = (_, selectedDate) => {
    setShowExpiryPicker(false);
    if (selectedDate) {
      updateVehicle(
        "expiry_date",
        selectedDate.toISOString().split("T")[0]
      );
    }
  };

  /* ✅ MAIN FUNCTION (FIXED) */
  const handleAddVehicle = async () => {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    const { company, model, type, license_number } = vehicleData;

    // ✅ Match backend validation
    if (!company || !model || !type || !license_number) {
      Alert.alert("Warning", "Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...vehicleData,
        car_image: vehicleData.car_image || "",
      };

      const res = await AddVehicle(token, payload);

      console.log("🚗 API RESPONSE:", res);

      if (res.success) {
        Alert.alert("Success", res.message || "Vehicle saved 🚗");

        // ✅ Correct response
        onVehicleAdded?.(res.vehicle);

        onClose();
      } else {
        Alert.alert("Error", res.message || "Something went wrong");
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Error adding vehicle");
    } finally {
      setLoading(false);
    }
  };

  /* ✅ Disable logic FIXED */
  const isDisabled =
    !vehicleData.company ||
    !vehicleData.model ||
    !vehicleData.type ||
    !vehicleData.license_number;

  return (
    <Modal visible={visible} animationType="slide">
      <ScrollView style={styles.container}>
        <Text style={styles.title}>
          {existingVehicle ? "Update Vehicle" : "Add Vehicle"}
        </Text>

        <Text style={styles.label}>Company *</Text>
        <AppTextInput
          placeholder="e.g. Toyota, Hyundai"
          value={vehicleData.company}
          onChangeText={(t) => updateVehicle("company", t)}
        />

        <Text style={styles.label}>Model *</Text>
        <AppTextInput
          placeholder="e.g. Innova, Swift"
          value={vehicleData.model}
          onChangeText={(t) => updateVehicle("model", t)}
        />

        <Text style={styles.label}>Vehicle Type *</Text>
        <AppTextInput
          placeholder="e.g. car, suv"
          value={vehicleData.type}
          onChangeText={(t) => updateVehicle("type", t)}
        />

        <Text style={styles.label}>License Number *</Text>
        <AppTextInput
          placeholder="Driving license number"
          value={vehicleData.license_number}
          onChangeText={(t) => updateVehicle("license_number", t)}
        />

        <Text style={styles.label}>Car Number</Text>
        <AppTextInput
          placeholder="Vehicle registration number"
          value={vehicleData.car_no}
          onChangeText={(t) => updateVehicle("car_no", t)}
        />

        {/* IMAGE */}
        <Text style={styles.label}>Car Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Text>
            {vehicleData.car_image
              ? "Change Car Image"
              : "Select Car Image"}
          </Text>
        </TouchableOpacity>

        {vehicleData.car_image ? (
          <Image
            source={{
              uri: `data:image/jpeg;base64,${vehicleData.car_image}`,
            }}
            style={styles.image}
          />
        ) : null}

        {/* ISSUE DATE */}
        <Text style={styles.label}>Issue Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowIssuePicker(true)}
        >
          <Text>
            {vehicleData.issue_date || "Select Issue Date"}
          </Text>
        </TouchableOpacity>

        {showIssuePicker && (
          <DateTimePicker
            value={
              vehicleData.issue_date
                ? new Date(vehicleData.issue_date)
                : new Date()
            }
            mode="date"
            onChange={onIssueDateChange}
          />
        )}

        {/* EXPIRY DATE */}
        <Text style={styles.label}>Expiry Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowExpiryPicker(true)}
        >
          <Text>
            {vehicleData.expiry_date || "Select Expiry Date"}
          </Text>
        </TouchableOpacity>

        {showExpiryPicker && (
          <DateTimePicker
            value={
              vehicleData.expiry_date
                ? new Date(vehicleData.expiry_date)
                : new Date()
            }
            mode="date"
            onChange={onExpiryDateChange}
          />
        )}

        {/* BUTTON */}
        <TouchableOpacity
          style={[
            styles.button,
            isDisabled || loading ? { backgroundColor: "#888" } : {},
          ]}
          onPress={handleAddVehicle}
          disabled={loading || isDisabled}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Vehicle</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
};

export default AddVehicleModal;

/* ✅ STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    marginTop: 10,
    color: "#333",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
  },

  imagePicker: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  image: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 15,
  },

  dateButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
  },

  button: {
    backgroundColor: "#2653bb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },

  buttonText: { color: "#fff", fontWeight: "600" },

  cancel: {
    marginTop: 20,
    textAlign: "center",
    color: "#64748B",
  },
});