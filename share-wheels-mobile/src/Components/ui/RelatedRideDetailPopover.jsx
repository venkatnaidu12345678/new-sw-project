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
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import UserAvatar from "./UserAvatar";
import VehicleInfoStrip from "../VehicleInfoStrip";
import { DS } from "../../theme/designSystem";
import { formatDisplayDate, formatRideTimeLabel } from "../../Utils/dateUtils";
import { getRideDisplayFare } from "../../Utils/fareUtils";
import { rideDetails } from "../../ApiService/ridesApiServices";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { LAYOUT } from "../../theme/layout";

const MAX_CARD_HEIGHT = LAYOUT.screenHeight * 0.82;

const MetaRow = ({ icon, label, value, styles, colors }) => (
  <View style={styles.metaRow}>
    <Icon name={icon} size={16} color={colors.primary} />
    <View style={styles.metaTextCol}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  </View>
);

const RelatedRideDetailPopover = ({
  visible,
  ride: initialRide,
  loading: externalLoading = false,
  requestContext = null,
  joiningRideId = null,
  onClose,
  onJoinRide,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [ride, setRide] = useState(initialRide);
  const [fetching, setFetching] = useState(false);

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

  useEffect(() => {
    setRide(initialRide);
  }, [initialRide]);

  useEffect(() => {
    if (!visible || !initialRide?._id) return undefined;

    let cancelled = false;
    (async () => {
      try {
        setFetching(true);
        const token = await AsyncStorage.getItem("token");
        if (!token || cancelled) return;
        const res = await rideDetails(token, initialRide._id);
        if (!cancelled && res?.success && res.data) {
          setRide((prev) => ({ ...prev, ...res.data }));
        }
      } catch {
        /* list payload is enough for preview */
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, initialRide?._id]);

  if (!visible || !ride) return null;

  const loading = externalLoading || fetching;
  const isCourier = requestContext?.role === "Courier";
  const segFrom = requestContext?.from || requestContext?.raw?.from;
  const segTo = requestContext?.to || requestContext?.raw?.to;
  const showSegment =
    segFrom &&
    segTo &&
    (segFrom !== ride.from || segTo !== ride.to);
  const pending = isCourier
    ? ride.courierRequestPending
    : ride.passengerRequestPending;
  const joinBusy = joiningRideId && String(joiningRideId) === String(ride._id);
  const fare = getRideDisplayFare(ride);
  const dateLabel = formatDisplayDate(ride.date, { weekday: true }) || "—";
  const timeLabel = formatRideTimeLabel(ride.date, ride.startTime) || "—";
  const seats = ride.availableSeats ?? "—";

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
            <View style={styles.header}>
              <Text style={styles.title}>Driver ride</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading ride…</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
                bounces={false}
              >
                <View style={styles.driverRow}>
                  <UserAvatar user={ride.creator} size={48} borderColor={colors.primary} />
                  <View style={styles.driverText}>
                    <Text style={styles.driverName} numberOfLines={1}>
                      {ride.creator?.name || "Driver"}
                    </Text>
                    <Text style={styles.driverSub}>Published ride</Text>
                  </View>
                </View>

                {ride.vehicle || ride.creator?.vehicle ? (
                  <View style={styles.vehicleStrip}>
                    <VehicleInfoStrip vehicle={ride.vehicle || ride.creator?.vehicle} />
                  </View>
                ) : null}

                <View style={styles.tagRow}>
                  {ride.QuickReserve ? (
                    <View style={[styles.tag, styles.tagQuick]}>
                      <Icon name="flash" size={12} color={colors.successText} />
                      <Text style={[styles.tagText, { color: colors.successText }]}>
                        Quick reserve
                      </Text>
                    </View>
                  ) : null}
                  {ride.CanCarryCourier ? (
                    <View style={[styles.tag, styles.tagCourier]}>
                      <Icon name="cube-outline" size={12} color={colors.warningText} />
                      <Text style={[styles.tagText, { color: colors.warningText }]}>
                        Courier OK
                      </Text>
                    </View>
                  ) : null}
                  {pending ? (
                    <View style={[styles.tag, styles.tagPending]}>
                      <Icon name="hourglass-outline" size={12} color={colors.warningText} />
                      <Text style={[styles.tagText, { color: colors.warningText }]}>
                        Request pending
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.routePanel}>
                  <Text style={styles.routeHeading}>Full route</Text>
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, styles.routeDotFrom]} />
                    <View style={styles.routePointText}>
                      <Text style={styles.routeLabel}>From</Text>
                      <Text style={styles.routeValue}>{ride.from || "—"}</Text>
                    </View>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, styles.routeDotTo]} />
                    <View style={styles.routePointText}>
                      <Text style={styles.routeLabel}>To</Text>
                      <Text style={styles.routeValue}>{ride.to || "—"}</Text>
                    </View>
                  </View>
                </View>

                {showSegment ? (
                  <View style={styles.segmentPanel}>
                    <Text style={styles.segmentHeading}>Your requested segment</Text>
                    <Text style={styles.segmentText}>
                      {segFrom} → {segTo}
                    </Text>
                  </View>
                ) : null}

                <MetaRow
                  icon="calendar-outline"
                  label="Date"
                  value={dateLabel}
                  styles={styles}
                  colors={colors}
                />
                <MetaRow
                  icon="time-outline"
                  label="Departure"
                  value={timeLabel}
                  styles={styles}
                  colors={colors}
                />
                <MetaRow
                  icon="people-outline"
                  label="Seats available"
                  value={String(seats)}
                  styles={styles}
                  colors={colors}
                />

                {fare ? (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Fare</Text>
                    <Text style={styles.fareValue}>{fare}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>Close</Text>
              </TouchableOpacity>
              {onJoinRide && !pending ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, joinBusy && styles.primaryBtnDisabled]}
                  onPress={() => onJoinRide(ride)}
                  disabled={!!joiningRideId}
                  activeOpacity={0.85}
                >
                  {joinBusy ? (
                    <ActivityIndicator size="small" color={colors.inverseText} />
                  ) : (
                    <>
                      <Icon
                        name={isCourier ? "cube" : "person-add"}
                        size={16}
                        color={colors.inverseText}
                      />
                      <Text style={styles.primaryBtnText}>
                        {isCourier ? "Request courier" : "Request seat"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default RelatedRideDetailPopover;

const createStyles = (c) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    cardShell: {
      width: "100%",
      maxHeight: MAX_CARD_HEIGHT,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 20,
      maxHeight: MAX_CARD_HEIGHT,
      overflow: "hidden",
      ...DS.shadow.card,
      elevation: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: {
      fontSize: LAYOUT.font.section,
      fontWeight: "800",
      color: c.text,
    },
    closeBtn: {
      fontSize: 22,
      color: c.textMuted,
      fontWeight: "600",
    },
    loadingWrap: {
      paddingVertical: 48,
      alignItems: "center",
      gap: 10,
    },
    loadingText: {
      fontSize: LAYOUT.font.small,
      color: c.textMuted,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    driverText: {
      flex: 1,
      minWidth: 0,
    },
    driverName: {
      fontSize: LAYOUT.font.body,
      fontWeight: "800",
      color: c.text,
    },
    driverSub: {
      fontSize: LAYOUT.font.small,
      color: c.textMuted,
      marginTop: 2,
    },
    vehicleStrip: {
      marginBottom: 12,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 14,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    tagQuick: {
      backgroundColor: c.successBg,
    },
    tagCourier: {
      backgroundColor: c.warningBg,
    },
    tagPending: {
      backgroundColor: c.warningBg,
    },
    tagText: {
      fontSize: 11,
      fontWeight: "700",
    },
    routePanel: {
      backgroundColor: c.chipBg,
      borderRadius: LAYOUT.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      marginBottom: 12,
    },
    routeHeading: {
      fontSize: 11,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 10,
    },
    routePoint: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },
    routeDotFrom: {
      backgroundColor: "#22C55E",
    },
    routeDotTo: {
      backgroundColor: "#EF4444",
    },
    routeLine: {
      width: 2,
      height: 16,
      backgroundColor: c.border,
      marginLeft: 4,
      marginVertical: 4,
    },
    routePointText: {
      flex: 1,
    },
    routeLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
    },
    routeValue: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      marginTop: 2,
      lineHeight: 20,
    },
    segmentPanel: {
      backgroundColor: c.primaryMuted,
      borderRadius: LAYOUT.radius.md,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.primary,
    },
    segmentHeading: {
      fontSize: 11,
      fontWeight: "800",
      color: c.primaryText,
      marginBottom: 4,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 12,
    },
    metaTextCol: {
      flex: 1,
    },
    metaLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
    },
    metaValue: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      marginTop: 2,
    },
    fareRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    fareLabel: {
      fontSize: LAYOUT.font.body,
      fontWeight: "700",
      color: c.textMuted,
    },
    fareValue: {
      fontSize: LAYOUT.font.section,
      fontWeight: "800",
      color: c.primaryText,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    secondaryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: LAYOUT.radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    secondaryBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    primaryBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.primary,
      paddingVertical: 12,
      borderRadius: LAYOUT.radius.sm,
      minHeight: 44,
    },
    primaryBtnDisabled: {
      opacity: 0.7,
    },
    primaryBtnText: {
      color: c.inverseText,
      fontSize: 14,
      fontWeight: "800",
    },
  });
