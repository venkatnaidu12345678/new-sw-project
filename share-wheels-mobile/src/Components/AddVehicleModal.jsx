import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Dimensions,
  unstable_batchedUpdates,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

import { AddVehicle } from "../ApiService/ridesApiServices";
import AppTextInput from "./ui/AppTextInput";
import { useLookupOptions } from "../hooks/useLookupOptions";
import { alertError, alertValidation } from "../Utils/appAlert";
import { getCreateRideTheme } from "../theme/createRideTheme";
import { DS } from "../theme/designSystem";
import { isRemoteImageUrl, pickDocumentImage, pickVehicleImage } from "../Utils/imageUpload";
import {
  describeFilledFields,
} from "../Utils/vehicleDocumentOcr";
import { scanVehicleDocument } from "../Utils/vehicleDocumentScan";
import { verifyVehicleImage } from "../Utils/vehicleImageVerify";
import { useTheme } from "../context/ThemeContext";
import {
  EMPTY_VEHICLE_FORM,
  EMPTY_EXTRACTED_DETAILS,
  mapProfileToVehicleForm,
  mapProfileToVehicleImages,
  buildExtractedSnapshot,
  applyScannedFields,
  patchExtractedFromScan,
} from "../Utils/vehicleProfileMap";

const DOC_FIELDS = ["license_image", "rc_image", "car_image"];
const IDENTITY_DOC_FIELDS = ["license_image", "rc_image"];
const TOTAL_STEPS = 8;
const DOC_STATUS = {
  IDLE: "idle",
  SCANNING: "scanning",
  VERIFIED: "verified",
  FAILED: "failed",
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SHEET_MAX_HEIGHT = SCREEN_H * 0.9;

const TABS = [
  { key: "docs", label: "Scan docs", icon: "scan-outline" },
  { key: "details", label: "Vehicle info", icon: "car-sport-outline" },
];

const EMPTY_FORM = { ...EMPTY_VEHICLE_FORM };
const EMPTY_EXTRACTED = { ...EMPTY_EXTRACTED_DETAILS };

const TYPE_ICONS = {
  bike: "bicycle-outline",
  auto: "car-outline",
  car: "car-sport-outline",
};

const mapProfileToForm = mapProfileToVehicleForm;
const mapProfileToImages = mapProfileToVehicleImages;

const formatDisplayDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ─── Sub-components ─── */

const SegmentedTabs = ({ active, onChange, colors, theme }) => (
  <View style={[segStyles.wrap, { backgroundColor: colors.surfaceAlt }]}>
    {TABS.map((tab) => {
      const isActive = active === tab.key;
      return (
        <TouchableOpacity
          key={tab.key}
          style={[segStyles.tab, isActive && { backgroundColor: colors.surface }]}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.85}
        >
          {isActive ? (
            <LinearGradient
              colors={[theme.sections.vehicle.color, "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={segStyles.activePill}
            >
              <Icon name={tab.icon} size={15} color="#fff" />
              <Text style={segStyles.activeLabel}>{tab.label}</Text>
            </LinearGradient>
          ) : (
            <View style={segStyles.inactiveInner}>
              <Icon name={tab.icon} size={15} color={colors.textMuted} />
              <Text style={[segStyles.inactiveLabel, { color: colors.textMuted }]}>
                {tab.label}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const UploadRow = ({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  image,
  onPick,
  status,
  errorMessage,
  colors,
}) => {
  const previewUri = typeof image === "string" ? image : image?.uri;
  const scanning = status === DOC_STATUS.SCANNING;
  const verified = status === DOC_STATUS.VERIFIED;
  const failed = status === DOC_STATUS.FAILED;

  const borderColor = verified ? "#22C55E" : failed ? "#EF4444" : colors.border;

  return (
    <TouchableOpacity
      style={[uploadStyles.row, { backgroundColor: colors.surface, borderColor }]}
      onPress={onPick}
      activeOpacity={0.82}
      disabled={scanning}
    >
      {previewUri && (verified || scanning) ? (
        <Image source={{ uri: previewUri }} style={uploadStyles.thumb} resizeMode="cover" />
      ) : previewUri && failed ? (
        <Image source={{ uri: previewUri }} style={[uploadStyles.thumb, uploadStyles.thumbFailed]} resizeMode="cover" />
      ) : (
        <View style={[uploadStyles.iconBox, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={22} color={iconColor} />
        </View>
      )}

      <View style={uploadStyles.textCol}>
        <Text style={[uploadStyles.title, { color: colors.text }]}>{title}</Text>
        <Text
          style={[
            uploadStyles.sub,
            { color: failed ? "#EF4444" : colors.textMuted },
          ]}
          numberOfLines={2}
        >
          {scanning
            ? "Verifying document…"
            : verified
              ? "Verified · tap to replace"
              : failed
                ? errorMessage || "Verification failed · tap to retry"
                : subtitle}
        </Text>
      </View>

      <View style={uploadStyles.actionCol}>
        {scanning ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : verified ? (
          <View style={uploadStyles.doneBadge}>
            <Icon name="shield-checkmark" size={14} color="#fff" />
          </View>
        ) : failed ? (
          <View style={uploadStyles.failBadge}>
            <Icon name="alert" size={14} color="#fff" />
          </View>
        ) : (
          <View style={[uploadStyles.addBtn, { backgroundColor: iconBg }]}>
            <Icon name="add" size={18} color={iconColor} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const VehiclePreviewCard = ({ form, typeLabel, carImage }) => {
  const previewUri = typeof carImage === "string" ? carImage : carImage?.uri;
  const title = [form.company, form.model].filter(Boolean).join(" ") || "Your vehicle";
  const plate = form.car_no?.trim() || "REG NO";

  return (
    <LinearGradient
      colors={["#1D4ED8", "#4F46E5"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={previewStyles.card}
    >
      <View style={previewStyles.decor1} />
      <View style={previewStyles.decor2} />

      <View style={previewStyles.topRow}>
        <View>
          <Text style={previewStyles.eyebrow}>VEHICLE PREVIEW</Text>
          <Text style={previewStyles.title} numberOfLines={1}>{title}</Text>
          {typeLabel ? (
            <View style={previewStyles.typePill}>
              <Text style={previewStyles.typeText}>{typeLabel}</Text>
            </View>
          ) : null}
        </View>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={previewStyles.carThumb} resizeMode="cover" />
        ) : (
          <View style={previewStyles.carPlaceholder}>
            <Icon name="car-sport" size={28} color="rgba(255,255,255,0.5)" />
          </View>
        )}
      </View>

      <View style={previewStyles.plate}>
        <View style={previewStyles.plateStripe} />
        <Text style={previewStyles.plateText}>{plate}</Text>
        <View style={previewStyles.plateStripe} />
      </View>

      {form.license_number ? (
        <Text style={previewStyles.licenseHint}>DL · {form.license_number}</Text>
      ) : null}
    </LinearGradient>
  );
};

const TypeChip = ({ label, value, selected, icon, onPress, colors, theme }) => (
  <TouchableOpacity
    onPress={() => onPress(value)}
    activeOpacity={0.8}
    style={[
      chipStyles.chip,
      {
        backgroundColor: selected ? theme.sections.vehicle.bg : colors.surface,
        borderColor: selected ? theme.sections.vehicle.color : colors.border,
      },
    ]}
  >
    <Icon
      name={icon}
      size={16}
      color={selected ? theme.sections.vehicle.color : colors.textMuted}
    />
    <Text
      style={[
        chipStyles.chipText,
        { color: selected ? theme.sections.vehicle.color : colors.text },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const ExtractedDetailsCard = ({ extracted, colors, scanning = false }) => {
  const rows = [
    { label: "Licence number", value: extracted.license_number, primary: true },
    { label: "Registration number", value: extracted.vehicle_number, primary: true },
  ].filter((r) => r.value);

  if (rows.length === 0 && !scanning) return null;

  return (
    <View style={[extractStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={extractStyles.head}>
        {scanning ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon name="checkmark-done-circle" size={18} color="#22C55E" />
        )}
        <Text style={[extractStyles.title, { color: colors.text }]}>
          {scanning ? "Extracting details…" : "Extracted details"}
        </Text>
      </View>
      {scanning && rows.length === 0 ? (
        <Text style={[extractStyles.scanningHint, { color: colors.textMuted }]}>
          Reading licence / RC text from your photo
        </Text>
      ) : null}
      {rows.map((row) => (
        <View key={row.label} style={[extractStyles.row, { borderBottomColor: colors.border }]}>
          <Text
            style={[
              extractStyles.label,
              { color: row.primary ? colors.text : colors.textMuted },
              row.primary && extractStyles.labelPrimary,
            ]}
          >
            {row.label}
          </Text>
          <Text
            style={[
              extractStyles.value,
              { color: colors.text },
              row.primary && extractStyles.valuePrimary,
            ]}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

const InlineToast = ({ message, visible, colors }) => {
  if (!visible || !message) return null;
  return (
    <View style={[toastStyles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Icon name="sparkles" size={16} color="#22C55E" />
      <Text style={[toastStyles.text, { color: colors.text }]} numberOfLines={2}>{message}</Text>
    </View>
  );
};

const FormField = ({ label, required, children, colors }) => (
  <View style={formStyles.field}>
    <Text style={[formStyles.label, { color: colors.textMuted }]}>
      {label}
      {required ? <Text style={formStyles.req}> *</Text> : null}
    </Text>
    {children}
  </View>
);

/* ─── Main modal ─── */

const AddVehicleModal = ({ visible, onClose, onVehicleAdded, existingVehicle }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => getCreateRideTheme(colors), [colors]);
  const { options: vehicleTypes } = useLookupOptions("vehicle_type", "Select type");

  const [tab, setTab] = useState("docs");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [images, setImages] = useState({ car_image: null, license_image: null, rc_image: null });
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [docStatus, setDocStatus] = useState({
    license_image: DOC_STATUS.IDLE,
    rc_image: DOC_STATUS.IDLE,
    car_image: DOC_STATUS.IDLE,
  });
  const [docErrors, setDocErrors] = useState({
    license_image: "",
    rc_image: "",
    car_image: "",
  });
  const [extracted, setExtracted] = useState({ ...EMPTY_EXTRACTED });
  const [toastMsg, setToastMsg] = useState("");
  const modalOpenRef = useRef(false);

  const isUpdate = !!existingVehicle?.vehicleCompany;

  const displayExtracted = useMemo(
    () => buildExtractedSnapshot(form, extracted, existingVehicle),
    [form, extracted, existingVehicle]
  );

  const isScanningDocs = useMemo(
    () => DOC_FIELDS.some((field) => docStatus[field] === DOC_STATUS.SCANNING),
    [docStatus]
  );

  const initialDocStatus = useCallback((info) => {
    const verified = (url) =>
      url && (isRemoteImageUrl(url) || String(url).length > 0)
        ? DOC_STATUS.VERIFIED
        : DOC_STATUS.IDLE;
    return {
      license_image: verified(info?.licenseImage),
      rc_image: verified(info?.rcImage),
      car_image: verified(info?.carImage),
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      modalOpenRef.current = false;
      return;
    }
    if (modalOpenRef.current) return;

    modalOpenRef.current = true;
    const mappedForm = mapProfileToForm(existingVehicle);
    setTab("docs");
    setForm(mappedForm);
    setImages(mapProfileToImages(existingVehicle));
    setDocStatus(initialDocStatus(existingVehicle));
    setDocErrors({ license_image: "", rc_image: "", car_image: "" });
    setExtracted(buildExtractedSnapshot(mappedForm, {}, existingVehicle));
    setShowIssuePicker(false);
    setShowExpiryPicker(false);
    setToastMsg("");
  }, [visible, existingVehicle, initialDocStatus]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(""), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const isDocVerified = useCallback(
    (field) => docStatus[field] === DOC_STATUS.VERIFIED,
    [docStatus]
  );

  const hasIdentityDocVerified = useMemo(
    () => IDENTITY_DOC_FIELDS.some((field) => isDocVerified(field)),
    [isDocVerified]
  );

  const carPhotoVerified = isDocVerified("car_image");

  const canContinueToDetails = hasIdentityDocVerified;

  const vehicleTypeLabel = useMemo(() => {
    const match = vehicleTypes.find((o) => o.value === form.type);
    return match?.label || "";
  }, [form.type, vehicleTypes]);

  const filledCount = useMemo(() => {
    let n = 0;
    if (isDocVerified("license_image")) n++;
    if (isDocVerified("rc_image")) n++;
    if (isDocVerified("car_image")) n++;
    if (form.company?.trim()) n++;
    if (form.model?.trim()) n++;
    if (form.type?.trim()) n++;
    if (form.license_number?.trim()) n++;
    if (form.car_no?.trim()) n++;
    return n;
  }, [form, isDocVerified]);

  const applyScanToState = useCallback((result, documentType) => {
    const ocrPatch = patchExtractedFromScan(result, documentType);
    unstable_batchedUpdates(() => {
      setExtracted((prev) => {
        const next = { ...prev };
        Object.entries(ocrPatch).forEach(([key, value]) => {
          if (value) next[key] = value;
        });
        return next;
      });
      setForm((prev) => applyScannedFields(prev, result, documentType));
    });
  }, []);

  const setDocState = (field, status, error = "") => {
    setDocStatus((prev) => ({ ...prev, [field]: status }));
    setDocErrors((prev) => ({ ...prev, [field]: error }));
  };

  const pickImage = async (field) => {
    if (!DOC_FIELDS.includes(field)) return;

    try {
      const asset =
        field === "car_image" ? await pickVehicleImage() : await pickDocumentImage();
      if (!asset) return;

      setImages((prev) => ({ ...prev, [field]: asset }));
      setDocState(field, DOC_STATUS.SCANNING, "");

      await new Promise((resolve) => requestAnimationFrame(resolve));

      try {
        if (field === "car_image") {
          const vehicleResult = await verifyVehicleImage(asset);
          if (!vehicleResult.ok) {
            setDocState(field, DOC_STATUS.FAILED, vehicleResult.message);
            return;
          }
          setDocState(field, DOC_STATUS.VERIFIED, "");
          setToastMsg("Vehicle photo verified");
          return;
        }

        const before = { ...form };
        const docType = field === "license_image" ? "license" : "rc";
        const result = await scanVehicleDocument(docType, asset, vehicleTypes);

        applyScanToState(result, docType);

        if (!result.ok) {
          setDocState(field, DOC_STATUS.FAILED, result.message);
          return;
        }

        setDocState(field, DOC_STATUS.VERIFIED, "");

        const after = applyScannedFields(before, result, docType);
        const filled = describeFilledFields(before, after);
        if (field === "license_image" && result.extracted?.license_number) {
          setToastMsg(`Licence verified: ${result.extracted.license_number}`);
        } else if (field === "rc_image" && result.extracted?.vehicle_number) {
          setToastMsg(`Registration verified: ${result.extracted.vehicle_number}`);
        } else {
          setToastMsg(
            filled.length > 0 ? `Verified · filled ${filled.join(", ")}` : "Document verified"
          );
        }
      } catch (err) {
        setDocState(
          field,
          DOC_STATUS.FAILED,
          err?.message || "Could not verify this document."
        );
      }
    } catch (err) {
      alertError(err?.message || "Could not select image");
    }
  };

  const trySetTab = (nextTab) => {
    if (nextTab === "details" && !canContinueToDetails) {
      alertValidation("Verify at least your driving licence or RC photo before continuing.");
      return;
    }
    setTab(nextTab);
  };

  const imagesForSave = useMemo(
    () => ({
      license_image: isDocVerified("license_image") ? images.license_image : null,
      rc_image: isDocVerified("rc_image") ? images.rc_image : null,
      car_image: isDocVerified("car_image") ? images.car_image : null,
    }),
    [images, isDocVerified]
  );

  const validate = () => {
    if (!hasIdentityDocVerified) {
      alertValidation("Verify at least your driving licence or RC photo.");
      setTab("docs");
      return false;
    }
    if (!carPhotoVerified) {
      alertValidation("Upload and verify a clear vehicle photo.");
      setTab("docs");
      return false;
    }
    if (!form.company?.trim() || !form.model?.trim() || !form.type?.trim()) {
      alertValidation("Fill in company, model, and vehicle type.");
      setTab("details");
      return false;
    }
    if (isDocVerified("license_image") && !form.license_number?.trim()) {
      alertValidation("Enter your driving licence number.");
      setTab("details");
      return false;
    }
    if (isDocVerified("rc_image") && !form.car_no?.trim()) {
      alertValidation("Enter your vehicle registration number.");
      setTab("details");
      return false;
    }
    if (!form.car_no?.trim() && !form.license_number?.trim()) {
      alertValidation("Enter licence number or registration number.");
      setTab("details");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      alertError("User not authenticated", "Sign in required");
      return;
    }
    setLoading(true);
    try {
      const res = await AddVehicle(token, form, imagesForSave);
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

  const onIssueDateChange = (_, d) => {
    setShowIssuePicker(false);
    if (d) updateForm("issue_date", d.toISOString().split("T")[0]);
  };
  const onExpiryDateChange = (_, d) => {
    setShowExpiryPicker(false);
    if (d) updateForm("expiry_date", d.toISOString().split("T")[0]);
  };

  const canSave =
    hasIdentityDocVerified &&
    carPhotoVerified &&
    form.company?.trim() &&
    form.model?.trim() &&
    form.type?.trim() &&
    (!isDocVerified("license_image") || form.license_number?.trim()) &&
    (!isDocVerified("rc_image") || form.car_no?.trim()) &&
    (form.license_number?.trim() || form.car_no?.trim());

  const gradColors = isDark
    ? ["#1E3A8A", "#312E81", "#1E1B4B"]
    : ["#2563EB", "#4F46E5", "#7C3AED"];

  const footerPad = Math.max(insets.bottom, 12);

  const renderFooter = () => (
    <View
      style={[
        styles.footer,
        {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingBottom: footerPad,
        },
      ]}
    >
      {tab === "docs" ? (
        <TouchableOpacity
          onPress={() => trySetTab("details")}
          activeOpacity={0.9}
          disabled={!canContinueToDetails}
        >
          <LinearGradient
            colors={canContinueToDetails ? gradColors : ["#94A3B8", "#94A3B8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Next</Text>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={() => trySetTab("docs")}
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Icon name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.9}
            disabled={loading || !canSave}
            style={styles.ctaFlex}
          >
            <LinearGradient
              colors={loading || !canSave ? ["#94A3B8", "#94A3B8"] : gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.ctaText}>Submit</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: "rgba(2,6,23,0.65)" }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheetWrap, { height: SHEET_MAX_HEIGHT }]}>
          <View style={styles.sheet}>
            <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.handle} />
              <View style={styles.heroRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroEyebrow}>
                    {isUpdate ? "UPDATE" : "SETUP"} · {filledCount}/{TOTAL_STEPS}
                  </Text>
                  <Text style={styles.heroTitle}>
                    {isUpdate ? "Your vehicle" : "Add your vehicle"}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={14}>
                  <Icon name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.dotRow}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i < filledCount ? styles.dotFilled : styles.dotEmpty]}
                  />
                ))}
              </View>
            </LinearGradient>

            <View style={[styles.body, { backgroundColor: colors.background }]}>
              <View style={[styles.stickyHeader, { borderBottomColor: colors.border }]}>
                <SegmentedTabs active={tab} onChange={trySetTab} colors={colors} theme={theme} />
                <InlineToast message={toastMsg} visible={!!toastMsg} colors={colors} />
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {tab === "docs" ? (
                  <>
                    <View style={[styles.smartBanner, { backgroundColor: isDark ? "#1E3A8A33" : "#EFF6FF" }]}>
                      <View style={[styles.smartIcon, { backgroundColor: theme.sections.vehicle.color }]}>
                        <Icon name="scan" size={18} color="#fff" />
                      </View>
                      <View style={styles.smartText}>
                        <Text style={[styles.smartTitle, { color: colors.text }]}>Smart document scan</Text>
                        <Text style={[styles.smartSub, { color: colors.textMuted }]}>
                          Upload at least licence or RC — we extract numbers only. Add owner name manually.
                        </Text>
                      </View>
                    </View>

                    <UploadRow
                      icon="card-outline"
                      iconColor="#2563EB"
                      iconBg={isDark ? "#1E3A8A44" : "#DBEAFE"}
                      title="Driving license"
                      subtitle="Upload licence or RC (at least one) · extracts licence number"
                      image={images.license_image}
                      onPick={() => pickImage("license_image")}
                      status={docStatus.license_image}
                      errorMessage={docErrors.license_image}
                      colors={colors}
                    />
                    <UploadRow
                      icon="document-text-outline"
                      iconColor="#7C3AED"
                      iconBg={isDark ? "#4C1D9544" : "#EDE9FE"}
                      title="RC book"
                      subtitle="Upload licence or RC (at least one) · extracts registration number"
                      image={images.rc_image}
                      onPick={() => pickImage("rc_image")}
                      status={docStatus.rc_image}
                      errorMessage={docErrors.rc_image}
                      colors={colors}
                    />
                    <UploadRow
                      icon="camera-outline"
                      iconColor="#059669"
                      iconBg={isDark ? "#14532D44" : "#D1FAE5"}
                      title="Vehicle photo"
                      subtitle="Required · clear car/bike photo (camera or gallery)"
                      image={images.car_image}
                      onPick={() => pickImage("car_image")}
                      status={docStatus.car_image}
                      errorMessage={docErrors.car_image}
                      colors={colors}
                    />

                    <ExtractedDetailsCard
                      extracted={displayExtracted}
                      scanning={isScanningDocs}
                      colors={colors}
                    />

                    {!canContinueToDetails ? (
                      <View style={[styles.verifyHint, { backgroundColor: colors.surfaceAlt }]}>
                        <Icon name="information-circle-outline" size={18} color={colors.textMuted} />
                        <Text style={[styles.verifyHintText, { color: colors.textMuted }]}>
                          Verify at least your driving licence or RC, then add a vehicle photo
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <VehiclePreviewCard
                      form={form}
                      typeLabel={vehicleTypeLabel}
                      carImage={isDocVerified("car_image") ? images.car_image : null}
                    />

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle type</Text>
                    <View style={chipStyles.wrap}>
                      {vehicleTypes.map((opt) => (
                        <TypeChip
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                          selected={form.type === opt.value}
                          icon={TYPE_ICONS[opt.value] || "car-outline"}
                          onPress={(v) => updateForm("type", v)}
                          colors={colors}
                          theme={theme}
                        />
                      ))}
                    </View>

                    <View style={[styles.formBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.twoCol}>
                        <View style={styles.col}>
                          <FormField label="Make" required colors={colors}>
                            <AppTextInput
                              placeholder="Toyota"
                              value={form.company}
                              onChangeText={(t) => updateForm("company", t)}
                            />
                          </FormField>
                        </View>
                        <View style={styles.col}>
                          <FormField label="Model" required colors={colors}>
                            <AppTextInput
                              placeholder="Innova"
                              value={form.model}
                              onChangeText={(t) => updateForm("model", t)}
                            />
                          </FormField>
                        </View>
                      </View>

                      <FormField label="Registration number" required={isDocVerified("rc_image")} colors={colors}>
                        <View style={[styles.plateInput, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
                          <View style={styles.plateInputBadge}>
                            <Text style={styles.plateInputBadgeText}>IND</Text>
                          </View>
                          <AppTextInput
                            placeholder="TS09AB1234"
                            value={form.car_no}
                            onChangeText={(t) => updateForm("car_no", t.toUpperCase())}
                            autoCapitalize="characters"
                            style={styles.plateInputField}
                          />
                        </View>
                      </FormField>

                      <FormField
                        label="License number"
                        required={isDocVerified("license_image")}
                        colors={colors}
                      >
                        <AppTextInput
                          placeholder="DL-XX-XXXXXXX"
                          value={form.license_number}
                          onChangeText={(t) => updateForm("license_number", t)}
                          autoCapitalize="characters"
                        />
                      </FormField>

                      <FormField label="Owner name" colors={colors}>
                        <AppTextInput
                          placeholder="Enter owner name (optional)"
                          value={form.owner_name}
                          onChangeText={(t) => updateForm("owner_name", t)}
                          autoCapitalize="words"
                        />
                      </FormField>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Licence dates</Text>
                    <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Optional</Text>

                    <View style={styles.twoCol}>
                      <View style={styles.col}>
                        <Pressable
                          style={[styles.datePill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => setShowIssuePicker(true)}
                        >
                          <Icon name="calendar-outline" size={16} color={theme.sections.schedule.color} />
                          <Text style={[styles.datePillText, { color: form.issue_date ? colors.text : colors.textMuted }]}>
                            {form.issue_date ? formatDisplayDate(form.issue_date) : "Issue date"}
                          </Text>
                        </Pressable>
                        {showIssuePicker ? (
                          <DateTimePicker
                            value={form.issue_date ? new Date(form.issue_date) : new Date()}
                            mode="date"
                            onChange={onIssueDateChange}
                          />
                        ) : null}
                      </View>
                      <View style={styles.col}>
                        <Pressable
                          style={[styles.datePill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => setShowExpiryPicker(true)}
                        >
                          <Icon name="calendar-outline" size={16} color={theme.sections.schedule.color} />
                          <Text style={[styles.datePillText, { color: form.expiry_date ? colors.text : colors.textMuted }]}>
                            {form.expiry_date ? formatDisplayDate(form.expiry_date) : "Expiry date"}
                          </Text>
                        </Pressable>
                        {showExpiryPicker ? (
                          <DateTimePicker
                            value={form.expiry_date ? new Date(form.expiry_date) : new Date()}
                            mode="date"
                            onChange={onExpiryDateChange}
                          />
                        ) : null}
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>

            {renderFooter()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddVehicleModal;

/* ─── Styles ─── */

const segStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 0,
  },
  tab: { flex: 1, borderRadius: 11, overflow: "hidden" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 11,
  },
  activeLabel: { color: "#fff", fontWeight: "700", fontSize: 13 },
  inactiveInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  inactiveLabel: { fontWeight: "600", fontSize: 13 },
});

const uploadStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
    ...DS.shadow.card,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: 52, height: 52, borderRadius: 14 },
  thumbFailed: { opacity: 0.55 },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  actionCol: { alignItems: "center", justifyContent: "center" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  failBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
});

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    overflow: "hidden",
  },
  decor1: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decor2: {
    position: "absolute",
    left: -20,
    bottom: -40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginTop: 4, maxWidth: SCREEN_W * 0.55 },
  typePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  typeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  carThumb: { width: 72, height: 52, borderRadius: 12 },
  carPlaceholder: {
    width: 72,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  plate: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  plateStripe: { width: 4, height: 28, backgroundColor: "#1D4ED8", borderRadius: 2 },
  plateText: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 2,
  },
  licenseHint: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 10, fontWeight: "500" },
});

const chipStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
});

const extractStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 6,
    marginBottom: 10,
    ...DS.shadow.card,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: "700" },
  scanningHint: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  label: { fontSize: 12, flex: 0.45 },
  labelPrimary: { fontWeight: "700" },
  value: { fontSize: 13, fontWeight: "600", flex: 0.55, textAlign: "right" },
  valuePrimary: { fontSize: 14, fontWeight: "800" },
});

const toastStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  text: { flex: 1, fontSize: 13, fontWeight: "500" },
});

const formStyles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  req: { color: "#EF4444" },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetWrap: { width: "100%" },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    flexDirection: "column",
  },
  hero: { paddingHorizontal: 20, paddingBottom: 16, flexShrink: 0 },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: 10,
    marginBottom: 16,
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start" },
  heroLeft: { flex: 1 },
  heroEyebrow: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 1 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  dotFilled: { backgroundColor: "#fff" },
  dotEmpty: { backgroundColor: "rgba(255,255,255,0.25)" },
  body: {
    flex: 1,
    minHeight: 0,
    marginTop: -14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: DS.spacing.screen,
  },
  stickyHeader: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  smartBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  smartIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smartText: { flex: 1 },
  smartTitle: { fontSize: 14, fontWeight: "700" },
  smartSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  nextHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  nextHintText: { fontSize: 14, fontWeight: "700" },
  verifyHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  verifyHintText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 10, marginTop: -2 },
  formBlock: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...DS.shadow.card,
  },
  twoCol: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  plateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  plateInputBadge: {
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  plateInputBadgeText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  plateInputField: { flex: 1, borderWidth: 0 },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  datePillText: { fontSize: 13, fontWeight: "600", flex: 1 },
  footer: {
    flexShrink: 0,
    paddingTop: 12,
    paddingHorizontal: DS.spacing.screen,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...DS.shadow.card,
  },
  footerRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaFlex: { flex: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ghostBtn: { alignItems: "center", paddingVertical: 12 },
  ghostText: { fontSize: 14, fontWeight: "600" },
});
