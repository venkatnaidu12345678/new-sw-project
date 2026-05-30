import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Animated,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import calendarIcon from "../../assets/dateIcon.png";
import clockIcon from "../../assets/clock1.png";
import locationIcon from "../../assets/toicon.png";
import seatIcon from "../../assets/person.png";
import carIcon from "../../assets/caricon1.png";
import { DS } from "../../theme/designSystem";
import { formatDisplayTime } from "../../Utils/dateUtils";

const MAX_CARD_HEIGHT = Dimensions.get("window").height * 0.78;

const roleTheme = {
  Passenger: { bg: "#16A34A", chip: "#DCFCE7", text: "#166534" },
  Courier: { bg: "#F97316", chip: "#FFEDD5", text: "#C2410C" },
};

const displayValue = (value) => {
  if (value == null || value === "") return "—";
  return String(value);
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <Image source={icon} style={styles.detailIcon} />
    <View style={styles.detailTextCol}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{displayValue(value)}</Text>
    </View>
  </View>
);

const RequestDetailPopover = ({
  visible,
  request,
  loading = false,
  onClose,
  showRides = false,
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

  const theme = roleTheme[request?.role] || roleTheme.Passenger;
  const isCourier = request?.role === "Courier";
  const extraRows = request?.extraRows || [];

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
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.roleBadge, { backgroundColor: theme.bg }]}>
                <Text style={styles.roleBadgeText}>{request?.role || "Request"}</Text>
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
                <View style={styles.routeBlock}>
                  <Image source={locationIcon} style={styles.routeIcon} />
                  <Text style={styles.routeText}>
                    {request?.from || "—"} → {request?.to || "—"}
                  </Text>
                </View>

                <View style={styles.detailsBlock}>
                  <DetailRow icon={calendarIcon} label="Date" value={request?.date} />
                  <DetailRow
                    icon={clockIcon}
                    label="Time"
                    value={
                      request?.time && request.time !== "--"
                        ? request.time
                        : formatDisplayTime(
                            request?.raw?.startTime ||
                              request?.linkedRide?.startTime
                          ) || "—"
                    }
                  />
                  <DetailRow
                    icon={seatIcon}
                    label={isCourier ? "Parcel" : "Seats"}
                    value={request?.seats}
                  />
                  <DetailRow
                    icon={carIcon}
                    label={isCourier ? "Courier / Receiver" : "Driver"}
                    value={request?.car}
                  />
                  {extraRows.map((row, index) => (
                    <View key={`${row.label}-${index}`} style={styles.extraRow}>
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{displayValue(row.value)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.footerRow}>
                  <View style={[styles.statusPill, { backgroundColor: theme.chip }]}>
                    <Text style={[styles.statusText, { color: theme.text }]}>
                      {request?.status || "pending"}
                    </Text>
                  </View>
                  <Text style={styles.priceText}>{request?.price || "₹0"}</Text>
                </View>

              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default RequestDetailPopover;

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
  routeBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  routeIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  detailsBlock: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  extraRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailIcon: {
    width: 16,
    height: 16,
    marginTop: 2,
    marginRight: 10,
  },
  detailTextCol: {
    flex: 1,
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
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
});
