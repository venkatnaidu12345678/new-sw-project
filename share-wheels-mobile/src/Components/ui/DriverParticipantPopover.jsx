import React, { useEffect, useRef } from "react";
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
import { DS } from "../../theme/designSystem";

const MAX_CARD_HEIGHT = Dimensions.get("window").height * 0.78;

const roleTheme = {
  passenger: { bg: "#16A34A", chip: "#DCFCE7", text: "#166534", label: "Passenger" },
  courier: { bg: "#F97316", chip: "#FFEDD5", text: "#C2410C", label: "Courier" },
  Passenger: { bg: "#16A34A", chip: "#DCFCE7", text: "#166534", label: "Passenger" },
  Courier: { bg: "#F97316", chip: "#FFEDD5", text: "#C2410C", label: "Courier" },
};

const displayValue = (value) => {
  if (value == null || value === "") return "—";
  return String(value);
};

const DetailRow = ({ label, value }) => (
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
}) => {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
  const theme = roleTheme[role] || roleTheme.passenger;

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
                <ActivityIndicator size="large" color={DS.colors.primary} />
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

                {detail?.role === "courier" || detail?.role === "Courier" ? (
                  <View style={styles.parcelSection}>
                    <Text style={styles.parcelSectionTitle}>Parcel photo</Text>
                    {detail?.parcelImage ? (
                      <View style={styles.parcelImageWrap}>
                        <RemoteImage
                          source={detail.parcelImage}
                          style={styles.parcelImage}
                          resizeMode="cover"
                        />
                      </View>
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
              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default DriverParticipantPopover;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardShell: {
    width: "100%",
    maxHeight: MAX_CARD_HEIGHT,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: MAX_CARD_HEIGHT,
    overflow: "hidden",
    ...DS.shadow.card,
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
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    fontSize: 20,
    color: "#64748B",
    fontWeight: "700",
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    color: "#64748B",
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
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  verified: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
  },
  routeBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  routeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  parcelSection: {
    marginBottom: 12,
  },
  parcelSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  parcelMissing: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parcelImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  parcelImage: {
    width: "100%",
    height: 140,
  },
  detailsBlock: {
    gap: 10,
    marginBottom: 12,
  },
  detailRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 14,
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
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
});
