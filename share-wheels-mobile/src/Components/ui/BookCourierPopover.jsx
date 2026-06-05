import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { launchCamera } from "react-native-image-picker";
import BottomSlider from "../BottomSlider";
import {
  StyledTextInput,
  StyledPicker,
  RequestSection,
} from "./RequestFormUI";
import { getCourierTheme } from "../../theme/requestFormTheme";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { useLookupOptions } from "../../hooks/useLookupOptions";

const EMPTY = {
  courier_type: "",
  what_to_deliver: "",
  courier_img: null,
  amount_will: "",
  receiver_name: "",
  receiver_mobile: "",
  receiver_alternate_mobile: "",
  receiver_address: "",
};

const BookCourierPopover = ({
  visible,
  onClose,
  rideFrom,
  rideTo,
  blockReason,
  booking,
  onBook,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const theme = getCourierTheme(colors);
  const T = theme;
  const { pickerItems: courierTypeItems } = useLookupOptions(
    "courier_type",
    "Select type"
  );
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => {
    if (visible) setForm({ ...EMPTY });
  }, [visible]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCamera = () => {
    launchCamera(
      { mediaType: "photo", quality: 0.8 },
      (res) => {
        if (res.didCancel || res.errorCode) return;
        const asset = res.assets?.[0];
        if (!asset?.uri) return;
        update("courier_img", {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || "courier.jpg",
        });
      }
    );
  };

  const canBook = !blockReason && !booking;

  const handleSubmit = () => {
    onBook?.(form);
  };

  const handleClose = () => {
    if (booking) return;
    onClose?.();
  };

  return (
    <BottomSlider
      visible={visible}
      onClose={handleClose}
      scrollable
      solid
      heightRatio={0.88}
      closeDisabled={booking}
      dismissOnBackdropPress={!booking}
    >
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintOrange }]}>
            <Icon name="cube" size={22} color={colors.warningText} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Courier delivery</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {rideFrom} → {rideTo}
            </Text>
          </View>
        </View>

        {blockReason ? (
          <View style={styles.blockBox}>
            <Icon name="information-circle" size={20} color={colors.warningText} />
            <Text style={styles.blockText}>{blockReason}</Text>
          </View>
        ) : null}

        <RequestSection accent={T.sections.parcel} title="Parcel" theme={T}>
          <StyledPicker
            theme={T}
            accent={T.picker}
            items={courierTypeItems}
            label="Courier type"
            icon="layers-outline"
            selectedValue={form.courier_type}
            onValueChange={(v) => update("courier_type", v)}
          />
          <StyledTextInput
            theme={T}
            placeholder="What to deliver"
            value={form.what_to_deliver}
            onChangeText={(v) => update("what_to_deliver", v)}
            editable={!blockReason}
          />
          <StyledTextInput
            theme={T}
            placeholder="Declared value (₹)"
            value={form.amount_will}
            onChangeText={(v) => update("amount_will", v)}
            keyboardType="numeric"
            editable={!blockReason}
          />
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={openCamera}
            disabled={!!blockReason}
          >
            <Icon name="camera" size={18} color={colors.warningText} />
            <Text style={styles.uploadText}>
              {form.courier_img ? "Change parcel photo" : "Add parcel photo"}
            </Text>
          </TouchableOpacity>
          {form.courier_img?.uri ? (
            <Image source={{ uri: form.courier_img.uri }} style={styles.preview} />
          ) : null}
        </RequestSection>

        <RequestSection accent={T.sections.receiver} title="Receiver" theme={T}>
          <StyledTextInput
            theme={T}
            placeholder="Full name"
            value={form.receiver_name}
            onChangeText={(v) => update("receiver_name", v)}
            editable={!blockReason}
          />
          <StyledTextInput
            theme={T}
            placeholder="Mobile"
            value={form.receiver_mobile}
            onChangeText={(v) => update("receiver_mobile", v)}
            keyboardType="phone-pad"
            editable={!blockReason}
          />
          <StyledTextInput
            theme={T}
            placeholder="Alternate mobile"
            value={form.receiver_alternate_mobile}
            onChangeText={(v) => update("receiver_alternate_mobile", v)}
            keyboardType="phone-pad"
            editable={!blockReason}
          />
          <StyledTextInput
            theme={T}
            placeholder="Delivery address"
            value={form.receiver_address}
            onChangeText={(v) => update("receiver_address", v)}
            multiline
            editable={!blockReason}
          />
        </RequestSection>

        <TouchableOpacity
          style={[styles.primaryBtn, !canBook && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canBook}
          activeOpacity={0.88}
        >
          {booking ? (
            <ActivityIndicator color={colors.inverseText} />
          ) : (
            <Text style={styles.primaryBtnText}>Send courier request</Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSlider>
  );
};

export default BookCourierPopover;

const createStyles = (c) =>
  StyleSheet.create({
    content: { paddingBottom: 24 },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
      gap: 12,
      paddingHorizontal: 4,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: { flex: 1 },
    title: { fontSize: 18, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 13, color: c.textMuted, marginTop: 4 },
    blockBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: c.warningBg,
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
      marginHorizontal: 4,
      alignItems: "flex-start",
    },
    blockText: {
      flex: 1,
      color: c.warningText,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 18,
    },
    uploadBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.tintOrange,
      marginBottom: 10,
    },
    uploadText: { fontWeight: "700", color: c.warningText },
    preview: {
      width: "100%",
      height: 120,
      borderRadius: 10,
      marginBottom: 8,
    },
    primaryBtn: {
      backgroundColor: c.warningText,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 8,
      marginHorizontal: 4,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: {
      color: c.inverseText,
      fontWeight: "800",
      fontSize: 15,
    },
  });
