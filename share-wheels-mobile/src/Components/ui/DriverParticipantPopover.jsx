import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import UserAvatar from "./UserAvatar";
import RemoteImage from "./RemoteImage";
import ImagePreviewModal from "./ImagePreviewModal";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { getParticipantPopoverRoleTheme } from "../../theme/appTheme";

const MAX_CARD_HEIGHT = Dimensions.get("window").height * 0.78;

const displayValue = (value) => {
  if (value == null || value === "") return "—";
  return String(value);
};

const DetailRow = ({ label, value, styles }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{displayValue(value)}</Text>
  </View>
);

const DriverParticipantPopover = ({
  visible,
  detail,
  loading = false,
  onClose,
  onPick,
  picking = false,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [parcelPreviewOpen, setParcelPreviewOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.92);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  if (!visible) return null;

  const role = detail?.role || "passenger";
  const theme = getParticipantPopoverRoleTheme(colors, role);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <Animated.View style={[styles.cardShell, { opacity }]}>
          <Animated.View
            style={[styles.card, { transform: [{ scale }] }]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.roleBadge, { backgroundColor: theme.bg }]}>
                <Text style={styles.roleBadgeText}>{theme.label}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading details…</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
                bounces
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.profileRow}>
                  <UserAvatar user={detail?.user} size={52} />
                  <View style={styles.profileText}>
                    <Text style={styles.name}>{detail?.name || "—"}</Text>
                    {detail?.subtitle ? (
                      <Text style={styles.subtitle}>{detail.subtitle}</Text>
                    ) : null}
                    {detail?.verified ? (
                      <Text style={styles.verified}>✓ Boarding verified</Text>
                    ) : null}
                  </View>
                </View>

                {detail?.route ? (
                  <View style={styles.routeBlock}>
                    <Text style={styles.routeText}>{detail.route}</Text>
                  </View>
                ) : null}

                {detail?.siblingNote ? (
                  <View style={styles.noticeBlock}>
                    <Text style={styles.noticeText}>{detail.siblingNote}</Text>
                  </View>
                ) : null}

                {detail?.conflictMessage ? (
                  <View style={[styles.noticeBlock, styles.noticeBlockDanger]}>
                    <Text style={[styles.noticeText, styles.noticeTextDanger]}>
                      {detail.conflictMessage}
                    </Text>
                  </View>
                ) : null}

                {detail?.role === "courier" || detail?.role === "Courier" ? (
                  <View style={styles.parcelSection}>
                    <Text style={styles.parcelSectionTitle}>Parcel photo</Text>
                    {detail?.parcelImage ? (
                      <Pressable
                        onPress={() => setParcelPreviewOpen(true)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel="View parcel photo full screen"
                        style={styles.parcelImageWrap}
                      >
                        <RemoteImage
                          source={detail.parcelImage}
                          style={styles.parcelImage}
                          resizeMode="cover"
                        />
                        <Text style={styles.parcelTapHint}>Tap to view full size</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.parcelMissing}>No parcel photo uploaded</Text>
                    )}
                  </View>
                ) : null}

                <View style={styles.detailsBlock}>
                  {(detail?.rows || []).map((row, index) => (
                    <DetailRow
                      key={`${row.label}-${index}`}
                      label={row.label}
                      value={row.value}
                      styles={styles}
                    />
                  ))}
                </View>

                {detail?.price != null ? (
                  <View style={styles.footerRow}>
                    <Text style={styles.priceLabel}>
                      {detail?.priceLabel || "Amount"}
                    </Text>
                    <Text style={styles.priceText}>₹{detail.price}</Text>
                  </View>
                ) : null}

                {detail?.status ? (
                  <View style={[styles.statusPill, { backgroundColor: theme.chip }]}>
                    <Text style={[styles.statusText, { color: theme.text }]}>
                      {detail.status}
                    </Text>
                  </View>
                ) : null}

                {onPick && !detail?.pickDisabled ? (
                  <Pressable
                    style={[styles.pickBtn, picking && styles.pickBtnDisabled]}
                    onPress={onPick}
                    disabled={picking}
                  >
                    {picking ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.pickBtnText}>
                        {detail?.role === "courier" ? "Pick courier" : "Pick passenger"}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </View>

      <ImagePreviewModal
        visible={parcelPreviewOpen}
        source={detail?.parcelImage}
        title={detail?.name ? `Parcel — ${detail.name}` : "Parcel photo"}
        onClose={() => setParcelPreviewOpen(false)}
      />
    </Modal>
  );
};

export default DriverParticipantPopover;

const createStyles = (c) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardShell: {
    width: "100%",
    maxHeight: MAX_CARD_HEIGHT,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    maxHeight: MAX_CARD_HEIGHT,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: c.inverseText,
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    fontSize: 20,
    color: c.textMuted,
    fontWeight: "700",
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    color: c.textMuted,
    fontSize: 13,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  profileText: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: c.text,
  },
  subtitle: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 2,
  },
  verified: {
    fontSize: 12,
    color: c.successText,
    fontWeight: "600",
    marginTop: 4,
  },
  routeBlock: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "600",
    color: c.text,
  },
  parcelSection: {
    marginBottom: 12,
  },
  parcelSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  parcelMissing: {
    fontSize: 13,
    color: c.textMuted,
    fontStyle: "italic",
    backgroundColor: c.surfaceAlt,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  parcelImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: c.chipBg,
  },
  parcelImage: {
    width: "100%",
    height: 140,
  },
  parcelTapHint: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: "center",
    paddingVertical: 8,
    fontWeight: "500",
  },
  detailsBlock: {
    gap: 10,
    marginBottom: 12,
  },
  detailRow: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  detailLabel: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: c.text,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 14,
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: "600",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "800",
    color: c.text,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  noticeBlock: {
    backgroundColor: c.tintOrange || c.primaryMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  noticeBlockDanger: {
    backgroundColor: c.dangerBg || "#FEE2E2",
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: c.text,
    fontWeight: "600",
  },
  noticeTextDanger: {
    color: c.dangerText || "#B91C1C",
  },
  pickBtn: {
    marginTop: 12,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtnDisabled: {
    opacity: 0.65,
  },
  pickBtnText: {
    color: c.inverseText,
    fontSize: 15,
    fontWeight: "800",
  },
});
