import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

import { AddVehicle } from "../ApiService/ridesApiServices";
import AppTextInput from "./ui/AppTextInput";
import { StyledPicker } from "./ui/RequestFormUI";
import { useLookupOptions } from "../hooks/useLookupOptions";
import { alertError, alertValidation } from "../Utils/appAlert";
import { CR } from "../theme/createRideTheme";
import { DS } from "../theme/designSystem";
import { INPUT_COLORS } from "../theme/inputTheme";
import { isRemoteImageUrl, pickImageAsset } from "../Utils/imageUpload";
import { useTheme } from "../context/ThemeContext";

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.92;

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

const SectionCard = ({
  title,
  subtitle,
  icon,
  iconBg,
  iconColor,
  children,
  cardStyle,
  titleColor,
  subtitleColor,
}) => (
  <View style={[styles.sectionCard, cardStyle]}>
    <View style={styles.sectionHead}>
      <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.sectionHeadText}>
        <Text style={[styles.sectionTitle, titleColor ? { color: titleColor } : null]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, subtitleColor ? { color: subtitleColor } : null]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
    {children}
  </View>
);

const ImageUploadField = ({ label, required, image, onPick, accent }) => {
  const previewUri = typeof image === "string" ? image : image?.uri;

  return (
    <View style={styles.imageField}>
      <Text style={[styles.fieldLabel, { color: accent.labelColor || CR.text }]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity
        style={[styles.imageTile, { borderColor: accent.border, backgroundColor: accent.bg }]}
        onPress={onPick}
        activeOpacity={0.85}
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.tilePreview} resizeMode="cover" />
        ) : (
          <View style={styles.tilePlaceholder}>
            <View style={[styles.tileIconWrap, { backgroundColor: accent.iconBg }]}>
              <Icon name="camera-outline" size={22} color={accent.icon} />
            </View>
            <Text style={styles.tileText}>Tap to upload</Text>
          </View>
        )}
        {previewUri ? (
          <View style={styles.tileBadge}>
            <Icon name="create-outline" size={14} color="#fff" />
            <Text style={styles.tileBadgeText}>Change</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const AddVehicleModal = ({
  visible,
  onClose,
  onVehicleAdded,
  existingVehicle,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { pickerItems: vehicleTypeItems } = useLookupOptions(
    "vehicle_type",
    "Select vehicle type"
  );
  const pickerTheme = useMemo(
    () => ({
      text: colors.text,
      textMuted: colors.textMuted,
      surface: colors.surface,
      cardBorder: colors.border,
    }),
    [colors]
  );
  const pickerAccent = useMemo(
    () => ({
      bg: colors.inputBg,
      border: colors.border,
      icon: colors.primary,
    }),
    [colors]
  );
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
      alertError(err?.message || "Could not select image");
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
      alertError("User not authenticated", "Sign in required");
      return;
    }

    if (
      !form.company?.trim() ||
      !form.model?.trim() ||
      !form.type?.trim() ||
      !form.license_number?.trim()
    ) {
      alertValidation(
        "Company, model, vehicle type, and license number are required."
      );
      return;
    }
    if (!form.car_no?.trim()) {
      alertValidation("Vehicle registration number is required.");
      return;
    }
    if (!hasImage("license_image")) {
      alertValidation("Please upload your driving license image.");
      return;
    }
    if (!hasImage("rc_image")) {
      alertValidation("Please upload your RC (registration certificate) image.");
      return;
    }

    setLoading(true);
    try {
      const res = await AddVehicle(token, form, images);

      if (res?.success) {
        onVehicleAdded?.(res.vehicle);
        onClose?.();
      } else {
        alertError(res?.message || "Something went wrong");
      }
    } catch (err) {
      alertError(err?.message || "Error adding vehicle");
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
  const docAccent = isDark
    ? {
        bg: "#1E3A8A33",
        border: colors.border,
        icon: colors.primary,
        iconBg: colors.surfaceAlt,
        labelColor: colors.text,
      }
    : {
        bg: "#EFF6FF",
        border: "#BFDBFE",
        icon: "#2563EB",
        iconBg: "#DBEAFE",
        labelColor: CR.text,
      };
  const carAccent = isDark
    ? {
        bg: "#14532D33",
        border: colors.border,
        icon: "#34D399",
        iconBg: colors.surfaceAlt,
        labelColor: colors.text,
      }
    : {
        bg: "#F0FDF4",
        border: "#BBF7D0",
        icon: "#059669",
        iconBg: "#D1FAE5",
        labelColor: CR.text,
      };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <KeyboardAvoidingView
          style={[styles.sheetWrap, { maxHeight: SHEET_MAX_HEIGHT }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <LinearGradient
              colors={isDark ? [colors.surfaceAlt, colors.surface, "#1E3A8A"] : CR.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroDecor} />
              <View style={styles.heroRow}>
                <View style={styles.heroIconWrap}>
                  <Icon name="car-sport" size={26} color={CR.heroIcon} />
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>
                    {isUpdate ? "Update vehicle" : "Add your vehicle"}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Required before you can publish a ride
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={12}
                  accessibilityLabel="Close"
                >
                  <Icon name="close" size={22} color={CR.text} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <SectionCard
                title="Vehicle details"
                subtitle="Make, model, and registration"
                icon="information-circle-outline"
                iconBg={CR.sections.vehicle.bg}
                iconColor={CR.sections.vehicle.color}
                cardStyle={{ backgroundColor: colors.surface, borderColor: colors.border }}
                titleColor={colors.text}
                subtitleColor={colors.textMuted}
              >
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Company *</Text>
                <AppTextInput
                  placeholder="e.g. Toyota, Hyundai"
                  value={form.company}
                  onChangeText={(t) => updateForm("company", t)}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Model *</Text>
                <AppTextInput
                  placeholder="e.g. Innova, Swift"
                  value={form.model}
                  onChangeText={(t) => updateForm("model", t)}
                />

                <StyledPicker
                  theme={pickerTheme}
                  accent={pickerAccent}
                  label="Vehicle type"
                  icon="car-outline"
                  selectedValue={form.type}
                  onValueChange={(v) => updateForm("type", v)}
                  items={vehicleTypeItems}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>License number *</Text>
                <AppTextInput
                  placeholder="Driving license number"
                  value={form.license_number}
                  onChangeText={(t) => updateForm("license_number", t)}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Registration number (RC) *</Text>
                <AppTextInput
                  placeholder="Vehicle plate number"
                  value={form.car_no}
                  onChangeText={(t) => updateForm("car_no", t)}
                  autoCapitalize="characters"
                />
              </SectionCard>

              <SectionCard
                title="Documents & photos"
                subtitle="Secure upload via Cloudinary"
                icon="document-text-outline"
                iconBg={CR.sections.schedule.bg}
                iconColor={CR.sections.schedule.color}
                cardStyle={{ backgroundColor: colors.surface, borderColor: colors.border }}
                titleColor={colors.text}
                subtitleColor={colors.textMuted}
              >
                <ImageUploadField
                  label="Driving license photo"
                  required
                  image={images.license_image}
                  onPick={() => pickImage("license_image")}
                  accent={docAccent}
                />
                <ImageUploadField
                  label="RC (registration certificate)"
                  required
                  image={images.rc_image}
                  onPick={() => pickImage("rc_image")}
                  accent={docAccent}
                />
                <ImageUploadField
                  label="Car photo (optional)"
                  required={false}
                  image={images.car_image}
                  onPick={() => pickImage("car_image")}
                  accent={carAccent}
                />
              </SectionCard>

              <SectionCard
                title="License dates"
                subtitle="Optional but recommended"
                icon="calendar-outline"
                iconBg={CR.sections.pricing.bg}
                iconColor={CR.sections.pricing.color}
                cardStyle={{ backgroundColor: colors.surface, borderColor: colors.border }}
                titleColor={colors.text}
                subtitleColor={colors.textMuted}
              >
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Issue date</Text>
                <Pressable
                  style={[
                    styles.dateButton,
                    { borderColor: colors.border, backgroundColor: colors.inputBg },
                  ]}
                  onPress={() => setShowIssuePicker(true)}
                >
                  <Icon name="calendar-outline" size={18} color={CR.sections.schedule.color} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {form.issue_date || "Select issue date"}
                  </Text>
                </Pressable>
                {showIssuePicker ? (
                  <DateTimePicker
                    value={form.issue_date ? new Date(form.issue_date) : new Date()}
                    mode="date"
                    onChange={onIssueDateChange}
                  />
                ) : null}

                <Text style={[styles.fieldLabel, { marginTop: 12, color: colors.text }]}>Expiry date</Text>
                <Pressable
                  style={[
                    styles.dateButton,
                    { borderColor: colors.border, backgroundColor: colors.inputBg },
                  ]}
                  onPress={() => setShowExpiryPicker(true)}
                >
                  <Icon name="calendar-outline" size={18} color={CR.sections.schedule.color} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {form.expiry_date || "Select expiry date"}
                  </Text>
                </Pressable>
                {showExpiryPicker ? (
                  <DateTimePicker
                    value={
                      form.expiry_date ? new Date(form.expiry_date) : new Date()
                    }
                    mode="date"
                    onChange={onExpiryDateChange}
                  />
                ) : null}
              </SectionCard>
            </ScrollView>

            <View
              style={[
                styles.footer,
                { backgroundColor: colors.surface, borderTopColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={handleAddVehicle}
                disabled={loading || isDisabled}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={
                    isDisabled || loading
                      ? ["#94A3B8", "#94A3B8"]
                      : [CR.sections.vehicle.color, "#2563EB"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={styles.saveBtnText}>Save vehicle</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddVehicleModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    width: "100%",
  },
  sheet: {
    backgroundColor: CR.pageBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    maxHeight: SHEET_MAX_HEIGHT,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginTop: 10,
    marginBottom: 4,
  },
  hero: {
    paddingHorizontal: DS.spacing.lg,
    paddingTop: DS.spacing.md,
    paddingBottom: DS.spacing.lg,
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: CR.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.md,
  },
  heroText: { flex: 1, minWidth: 0, paddingRight: 8 },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CR.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: DS.spacing.screen,
    paddingTop: DS.spacing.md,
    paddingBottom: DS.spacing.md,
  },
  sectionCard: {
    backgroundColor: CR.surface,
    borderRadius: DS.radius.lg,
    padding: DS.spacing.lg,
    marginBottom: DS.spacing.md,
    borderWidth: 1,
    borderColor: CR.cardBorder,
    ...DS.shadow.card,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DS.spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.md,
  },
  sectionHeadText: { flex: 1, minWidth: 0 },
  sectionTitle: {
    fontSize: DS.font.section,
    fontWeight: "700",
    color: CR.text,
  },
  sectionSubtitle: {
    fontSize: DS.font.small,
    color: CR.textMuted,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: DS.font.label,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
    color: CR.text,
  },
  required: { color: "#EF4444" },
  imageField: { marginBottom: 12 },
  imageTile: {
    height: 120,
    borderRadius: DS.radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
  },
  tilePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontSize: DS.font.small,
    color: CR.textMuted,
    fontWeight: "600",
  },
  tilePreview: {
    width: "100%",
    height: "100%",
  },
  tileBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tileBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: CR.cardBorder,
    padding: 14,
    borderRadius: DS.radius.md,
    backgroundColor: "#F8FAFC",
  },
  dateButtonText: {
    flex: 1,
    color: INPUT_COLORS.text,
    fontSize: 15,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: DS.spacing.screen,
    paddingTop: DS.spacing.sm,
    backgroundColor: CR.surface,
    borderTopWidth: 1,
    borderTopColor: CR.cardBorder,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: DS.radius.lg,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { color: CR.textMuted, fontWeight: "600", fontSize: 15 },
});
