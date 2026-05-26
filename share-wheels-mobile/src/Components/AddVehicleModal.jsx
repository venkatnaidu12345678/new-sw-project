import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";

import { AddVehicle } from "../ApiService/ridesApiServices";
import AppTextInput from "./ui/AppTextInput";
import { AUTH_COLORS } from "../theme/authTheme";
import { INPUT_COLORS } from "../theme/inputTheme";
import { isRemoteImageUrl, pickImageAsset } from "../Utils/imageUpload";

const EMPTY_FORM = {
  company: "",
  model: "",
  type: "",
  license_number: "",
  issue_date: "",
  expiry_date: "",
  car_no: "",
};

const mapProfileToForm = (info) => {
  if (!info) return { ...EMPTY_FORM };
  return {
    company: info.vehicleCompany || "",
    model: info.vehicleModel || "",
    type: info.vehicleType || "",
    license_number: info.licenseNumber || "",
    car_no: info.carNo || "",
    issue_date: info.issueDate ? String(info.issueDate).split("T")[0] : "",
    expiry_date: info.expiryDate ? String(info.expiryDate).split("T")[0] : "",
  };
};

const mapProfileToImages = (info) => ({
  car_image: info?.carImage || null,
  license_image: info?.licenseImage || null,
  rc_image: info?.rcImage || null,
});

const ImageUploadField = ({ label, required, image, onPick }) => {
  const previewUri =
    typeof image === "string"
      ? image
      : image?.uri;

  return (
    <View style={styles.imageField}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TouchableOpacity style={styles.imagePicker} onPress={onPick}>
        <Icon name="camera-outline" size={22} color={AUTH_COLORS.primary} />
        <Text style={styles.imagePickerText}>
          {previewUri ? "Change photo" : "Upload photo"}
        </Text>
      </TouchableOpacity>
      {previewUri ? (
        <Image
          source={{ uri: previewUri }}
          style={styles.previewImage}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
};

const AddVehicleModal = ({
  visible,
  onClose,
  onVehicleAdded,
  existingVehicle,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [images, setImages] = useState({
    car_image: null,
    license_image: null,
    rc_image: null,
  });
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(mapProfileToForm(existingVehicle));
    setImages(mapProfileToImages(existingVehicle));
    setShowIssuePicker(false);
    setShowExpiryPicker(false);
  }, [visible, existingVehicle]);

  const updateForm = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const pickImage = async (field) => {
    try {
      const asset = await pickImageAsset();
      if (asset) setImages((prev) => ({ ...prev, [field]: asset }));
    } catch (err) {
      Alert.alert("Error", err?.message || "Could not select image");
    }
  };

  const hasImage = (field) => {
    const img = images[field];
    if (!img) return false;
    if (typeof img === "string") return isRemoteImageUrl(img) || img.length > 0;
    return !!img.uri;
  };

  const onIssueDateChange = (_, selectedDate) => {
    setShowIssuePicker(false);
    if (selectedDate) {
      updateForm("issue_date", selectedDate.toISOString().split("T")[0]);
    }
  };

  const onExpiryDateChange = (_, selectedDate) => {
    setShowExpiryPicker(false);
    if (selectedDate) {
      updateForm("expiry_date", selectedDate.toISOString().split("T")[0]);
    }
  };

  const handleAddVehicle = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    if (
      !form.company?.trim() ||
      !form.model?.trim() ||
      !form.type?.trim() ||
      !form.license_number?.trim()
    ) {
      Alert.alert(
        "Required fields",
        "Company, model, type, and license number are required."
      );
      return;
    }
    if (!form.car_no?.trim()) {
      Alert.alert("Required field", "Vehicle registration number is required.");
      return;
    }
    if (!hasImage("license_image")) {
      Alert.alert("Required", "Please upload your driving license image.");
      return;
    }
    if (!hasImage("rc_image")) {
      Alert.alert("Required", "Please upload your RC (registration certificate) image.");
      return;
    }

    setLoading(true);
    try {
      const res = await AddVehicle(token, form, images);

      if (res?.success) {
        onVehicleAdded?.(res.vehicle);
        onClose?.();
      } else {
        Alert.alert("Error", res?.message || "Something went wrong");
      }
    } catch (err) {
      Alert.alert("Error", err?.message || "Error adding vehicle");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled =
    !form.company?.trim() ||
    !form.model?.trim() ||
    !form.type?.trim() ||
    !form.license_number?.trim() ||
    !form.car_no?.trim() ||
    !hasImage("license_image") ||
    !hasImage("rc_image");

  const isUpdate = !!existingVehicle?.vehicleCompany;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>
              {isUpdate ? "Update vehicle" : "Add your vehicle"}
            </Text>
            <Text style={styles.subtitle}>
              Photos are uploaded securely via Cloudinary
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Icon name="close" size={26} color={AUTH_COLORS.text} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Company *</Text>
            <AppTextInput
              placeholder="e.g. Toyota, Hyundai"
              value={form.company}
              onChangeText={(t) => updateForm("company", t)}
            />

            <Text style={styles.label}>Model *</Text>
            <AppTextInput
              placeholder="e.g. Innova, Swift"
              value={form.model}
              onChangeText={(t) => updateForm("model", t)}
            />

            <Text style={styles.label}>Vehicle type *</Text>
            <AppTextInput
              placeholder="e.g. car, suv"
              value={form.type}
              onChangeText={(t) => updateForm("type", t)}
            />

            <Text style={styles.label}>License number *</Text>
            <AppTextInput
              placeholder="Driving license number"
              value={form.license_number}
              onChangeText={(t) => updateForm("license_number", t)}
            />

            <Text style={styles.label}>Registration number (RC) *</Text>
            <AppTextInput
              placeholder="Vehicle plate number"
              value={form.car_no}
              onChangeText={(t) => updateForm("car_no", t)}
              autoCapitalize="characters"
            />

            <ImageUploadField
              label="Driving license photo"
              required
              image={images.license_image}
              onPick={() => pickImage("license_image")}
            />

            <ImageUploadField
              label="RC (registration certificate)"
              required
              image={images.rc_image}
              onPick={() => pickImage("rc_image")}
            />

            <ImageUploadField
              label="Car photo"
              required={false}
              image={images.car_image}
              onPick={() => pickImage("car_image")}
            />

            <Text style={styles.label}>License issue date</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowIssuePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {form.issue_date || "Select issue date"}
              </Text>
            </Pressable>
            {showIssuePicker && (
              <DateTimePicker
                value={form.issue_date ? new Date(form.issue_date) : new Date()}
                mode="date"
                onChange={onIssueDateChange}
              />
            )}

            <Text style={styles.label}>License expiry date</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowExpiryPicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {form.expiry_date || "Select expiry date"}
              </Text>
            </Pressable>
            {showExpiryPicker && (
              <DateTimePicker
                value={
                  form.expiry_date ? new Date(form.expiry_date) : new Date()
                }
                mode="date"
                onChange={onExpiryDateChange}
              />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (isDisabled || loading) && styles.saveBtnDisabled,
              ]}
              onPress={handleAddVehicle}
              disabled={loading || isDisabled}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save vehicle</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default AddVehicleModal;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AUTH_COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: AUTH_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: AUTH_COLORS.border,
  },
  headerTextWrap: { flex: 1, paddingRight: 12 },
  title: { fontSize: 22, fontWeight: "800", color: AUTH_COLORS.text },
  subtitle: { fontSize: 14, color: AUTH_COLORS.textMuted, marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AUTH_COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
    color: AUTH_COLORS.text,
  },
  imageField: { marginTop: 4 },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    padding: 14,
    borderRadius: 12,
    backgroundColor: INPUT_COLORS.background,
  },
  imagePickerText: { color: AUTH_COLORS.primary, fontWeight: "600" },
  previewImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    padding: 14,
    borderRadius: 12,
    backgroundColor: INPUT_COLORS.background,
  },
  dateButtonText: { color: INPUT_COLORS.text, fontSize: 15 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: AUTH_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: AUTH_COLORS.border,
  },
  saveBtn: {
    backgroundColor: AUTH_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: "#94A3B8" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { color: AUTH_COLORS.textMuted, fontWeight: "600", fontSize: 15 },
});
