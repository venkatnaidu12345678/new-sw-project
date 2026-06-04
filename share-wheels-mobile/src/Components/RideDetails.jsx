import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { getApiErrorMessage } from "../Utils/apiErrors";
import {
  courierSendRequestApi,
  passengerSendRequestApi,
  rideDetails,
} from "../ApiService/ridesApiServices";
import UserAvatar from "./ui/UserAvatar";
import VehicleInfoStrip from "./VehicleInfoStrip";
import KeyboardAwareScreen from "./ui/KeyboardAwareScreen";
import ScreenContainer from "./ui/ScreenContainer";
import ScreenHeader from "./ui/ScreenHeader";
import BookSeatPopover from "./ui/BookSeatPopover";
import BookCourierPopover from "./ui/BookCourierPopover";
import { formatDisplayTime } from "../Utils/dateUtils";
import { LAYOUT } from "../theme/layout";
import { profileData } from "../Navigation/AuthNavigator";
import {
  refUserId,
  getPassengerBookingBlockReason,
  getCourierBookingBlockReason,
  isUserPassengerOnRide,
  isUserCourierOnRide,
} from "../Utils/rideParticipantRole";

const RideDetails = ({ navigation, route }) => {
  const initialRide = route.params?.ride;
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { ProfileDetails } = profileData();

  const [rideInfo, setRideInfo] = useState(initialRide);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [seatPopoverOpen, setSeatPopoverOpen] = useState(false);
  const [courierPopoverOpen, setCourierPopoverOpen] = useState(false);
  const [bookingPassenger, setBookingPassenger] = useState(false);
  const [bookingCourier, setBookingCourier] = useState(false);

  const myUserId = refUserId(
    ProfileDetails?._id ||
      ProfileDetails?.id ||
      ProfileDetails?.data?.personalInfo?._id ||
      ProfileDetails?.data?.personalInfo?.id
  );

  const refreshRideDetails = useCallback(async () => {
    const rideId = initialRide?._id;
    if (!rideId) return;
    try {
      setDetailsLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await rideDetails(token, rideId);
      if (res?.success && res.data) {
        setRideInfo((prev) => ({ ...prev, ...res.data }));
      }
    } catch (e) {
      if (__DEV__) console.warn("[RideDetails] refresh:", e?.message);
    } finally {
      setDetailsLoading(false);
    }
  }, [initialRide?._id]);

  useEffect(() => {
    refreshRideDetails();
  }, [refreshRideDetails]);

  const ride = rideInfo;
  const isOwnRide =
    !!myUserId && !!ride?.creator && refUserId(ride.creator) === myUserId;
  const quickReserve = !!ride?.QuickReserve;
  const canCarryCourier = !!ride?.CanCarryCourier;
  const maxSeats = Math.max(0, Number(ride?.availableSeats) || 0);
  const seatFare = Number(ride?.ride_amount) || 0;

  const passengerBlockReason = useMemo(
    () => getPassengerBookingBlockReason(ride, myUserId, { isOwnRide }),
    [ride, myUserId, isOwnRide]
  );

  const courierBlockReason = useMemo(
    () =>
      getCourierBookingBlockReason(ride, myUserId, {
        isOwnRide,
        canCarryCourier,
      }),
    [ride, myUserId, isOwnRide, canCarryCourier]
  );

  const onRideAsPassenger = isUserPassengerOnRide(ride, myUserId);
  const onRideAsCourier = isUserCourierOnRide(ride, myUserId);

  if (!ride) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>No ride data found</Text>
      </View>
    );
  }

  const rideDate = ride?.date ? new Date(ride.date) : null;
  const formattedRideDate = rideDate
    ? rideDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Date not available";
  const formattedRideTime =
    formatDisplayTime(ride?.startTime || rideDate) || "N/A";

  const handleBookPassenger = async (seats) => {
    if (bookingPassenger) return;
    if (passengerBlockReason) {
      Alert.alert("Cannot book", passengerBlockReason);
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Sign in required", "Please log in to book a seat.");
        return;
      }
      if (maxSeats < 1) {
        Alert.alert("No seats", "This ride has no seats available.");
        return;
      }

      setBookingPassenger(true);
      const response = await passengerSendRequestApi(token, {
        rideId: ride._id,
        requires_seats: seats,
      });

      if (response?.success) {
        const title =
          response.bookingStatus === "confirmed"
            ? "Booking confirmed"
            : "Request sent";
        setSeatPopoverOpen(false);
        await refreshRideDetails();
        Alert.alert(
          title,
          response.message ||
            `Your request for ${seats} seat(s) was sent to the driver.`,
          [
            {
              text: "OK",
              onPress: () =>
                navigation.navigate("Navigator", { screen: "Home" }),
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(
          "Booking failed",
          getApiErrorMessage(response, "Could not send your booking request.")
        );
      }
    } catch (error) {
      Alert.alert("Booking failed", getApiErrorMessage(error));
    } finally {
      setBookingPassenger(false);
    }
  };

  const handleBookCourier = async (courierForm) => {
    if (bookingCourier) return;
    if (courierBlockReason) {
      Alert.alert("Cannot book courier", courierBlockReason);
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Sign in required", "Please log in to continue.");
        return;
      }

      if (
        !courierForm.courier_type ||
        !courierForm.what_to_deliver ||
        !courierForm.amount_will ||
        !courierForm.receiver_name ||
        !courierForm.receiver_mobile ||
        !courierForm.receiver_alternate_mobile ||
        !courierForm.receiver_address
      ) {
        Alert.alert("Missing fields", "Please fill all courier fields.");
        return;
      }

      if (!courierForm.courier_img) {
        Alert.alert("Photo required", "Upload a parcel photo first.");
        return;
      }

      setBookingCourier(true);
      const now = new Date();
      const payload = {
        rideId: ride._id,
        from: ride.from,
        to: ride.to,
        courier_type: courierForm.courier_type,
        what_to_deliver: courierForm.what_to_deliver,
        courier_img: courierForm.courier_img,
        amount_will: courierForm.amount_will,
        date: now.toISOString(),
        timeSlot: now.toISOString(),
        receiver_name: courierForm.receiver_name,
        receiver_mobile: courierForm.receiver_mobile,
        receiver_alternate_mobile: courierForm.receiver_alternate_mobile,
        receiver_address: courierForm.receiver_address,
      };

      const response = await courierSendRequestApi(token, payload);

      if (response?.success) {
        const title =
          response.bookingStatus === "confirmed"
            ? "Booking confirmed"
            : "Request sent";
        setCourierPopoverOpen(false);
        await refreshRideDetails();
        Alert.alert(
          title,
          response.message || "Courier request sent successfully.",
          [
            {
              text: "OK",
              onPress: () =>
                navigation.navigate("Navigator", { screen: "Home" }),
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(
          "Booking failed",
          getApiErrorMessage(response, "Courier booking failed.")
        );
      }
    } catch (error) {
      Alert.alert("Booking failed", getApiErrorMessage(error));
    } finally {
      setBookingCourier(false);
    }
  };

  const openSeatPopover = () => {
    if (passengerBlockReason) {
      Alert.alert("Cannot book", passengerBlockReason);
      return;
    }
    setSeatPopoverOpen(true);
  };

  const openCourierPopover = () => {
    if (courierBlockReason) {
      Alert.alert("Cannot book courier", courierBlockReason);
      return;
    }
    setCourierPopoverOpen(true);
  };

  return (
    <ScreenContainer edges={["top", "bottom"]}>
      <ScreenHeader title="Ride details" style={styles.fixedHeader} />
      <KeyboardAwareScreen style={styles.container}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {detailsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Updating ride info…</Text>
            </View>
          ) : null}

          {/* Route hero */}
          <View style={styles.routeCard}>
            <View style={styles.routeDateRow}>
              <Icon name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.routeDate}>{formattedRideDate}</Text>
              <View style={styles.timePill}>
                <Icon name="time-outline" size={14} color={colors.primary} />
                <Text style={styles.timePillText}>{formattedRideTime}</Text>
              </View>
            </View>
            <View style={styles.routeStop}>
              <View style={[styles.routeDot, { backgroundColor: colors.successText }]} />
              <Text style={styles.routeCity}>{ride.from || "N/A"}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeStop}>
              <View style={[styles.routeDot, { backgroundColor: colors.errorText }]} />
              <Text style={styles.routeCity}>{ride.to || "N/A"}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Icon name="people-outline" size={18} color={colors.primary} />
              <Text style={styles.statValue}>{maxSeats}</Text>
              <Text style={styles.statLabel}>seats left</Text>
            </View>
            <View style={styles.statChip}>
              <Icon name="cash-outline" size={18} color={colors.primary} />
              <Text style={styles.statValue}>₹{seatFare}</Text>
              <Text style={styles.statLabel}>per seat</Text>
            </View>
            {canCarryCourier ? (
              <View style={[styles.statChip, styles.statChipCourier]}>
                <Icon name="cube-outline" size={18} color={colors.warningText} />
                <Text style={[styles.statValue, styles.statValueCourier]}>Yes</Text>
                <Text style={styles.statLabel}>courier</Text>
              </View>
            ) : null}
          </View>

          {/* Driver */}
          <View style={styles.card}>
            <View style={styles.driverRow}>
              <UserAvatar user={ride.creator} size={52} />
              <View style={styles.driverCol}>
                <Text style={styles.driverName}>
                  {ride.creator?.name || "Driver"}
                </Text>
                <View style={styles.verifiedRow}>
                  <Icon
                    name="shield-checkmark"
                    size={14}
                    color={colors.successText}
                  />
                  <Text style={styles.verified}>Verified profile</Text>
                </View>
              </View>
            </View>
            {ride.vehicle ? (
              <VehicleInfoStrip vehicle={ride.vehicle} compact />
            ) : null}
          </View>

          {/* Status banner */}
          {isOwnRide ? (
            <View style={[styles.banner, styles.bannerInfo]}>
              <Icon name="car" size={20} color={colors.infoText} />
              <Text style={styles.bannerInfoText}>
                This is your ride. Manage passengers from Upcoming Rides.
              </Text>
            </View>
          ) : onRideAsPassenger ? (
            <View style={[styles.banner, styles.bannerSuccess]}>
              <Icon name="checkmark-circle" size={20} color={colors.successText} />
              <Text style={styles.bannerSuccessText}>
                You are on this ride as a passenger.
              </Text>
            </View>
          ) : onRideAsCourier ? (
            <View style={[styles.banner, styles.bannerCourier]}>
              <Icon name="cube" size={20} color={colors.warningText} />
              <Text style={styles.bannerCourierText}>
                You are on this ride as a courier.
              </Text>
            </View>
          ) : quickReserve ? (
            <View style={[styles.banner, styles.bannerSuccess]}>
              <Icon name="flash" size={20} color={colors.successText} />
              <Text style={styles.bannerSuccessText}>
                Quick Reserve — booking is confirmed instantly.
              </Text>
            </View>
          ) : (
            <View style={[styles.banner, styles.bannerWarn]}>
              <Icon name="hourglass-outline" size={20} color={colors.warningText} />
              <Text style={styles.bannerWarnText}>
                Driver must approve your booking before you join the ride.
              </Text>
            </View>
          )}

          {/* Preferences */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ride preferences</Text>
            <View style={styles.prefChips}>
              <View style={styles.prefChip}>
                <Icon name="ban-outline" size={16} color={colors.textMuted} />
                <Text style={styles.prefChipText}>No smoking</Text>
              </View>
              <View style={styles.prefChip}>
                <Icon name="paw-outline" size={16} color={colors.textMuted} />
                <Text style={styles.prefChipText}>No pets</Text>
              </View>
            </View>
          </View>

          {/* Booking actions */}
          {!isOwnRide ? (
            <View style={styles.actionsBlock}>
              <Text style={styles.actionsTitle}>Join this ride</Text>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  passengerBlockReason && styles.actionCardDisabled,
                ]}
                onPress={openSeatPopover}
                activeOpacity={0.88}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.successBg }]}>
                  <Icon name="person-add" size={22} color={colors.successText} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Book a seat</Text>
                  <Text style={styles.actionSub} numberOfLines={2}>
                    {passengerBlockReason ||
                      `${maxSeats} seat${maxSeats !== 1 ? "s" : ""} · ₹${seatFare} each`}
                  </Text>
                </View>
                <Icon
                  name="chevron-forward"
                  size={20}
                  color={passengerBlockReason ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>

              {canCarryCourier ? (
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    courierBlockReason && styles.actionCardDisabled,
                  ]}
                  onPress={openCourierPopover}
                  activeOpacity={0.88}
                >
                  <View style={[styles.actionIcon, styles.actionIconCourier]}>
                    <Icon name="cube" size={22} color={colors.warningText} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Send a parcel</Text>
                    <Text style={styles.actionSub} numberOfLines={2}>
                      {courierBlockReason || "Courier delivery on this route"}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={courierBlockReason ? colors.textMuted : colors.warningText}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAwareScreen>

      <BookSeatPopover
        visible={seatPopoverOpen}
        onClose={() => !bookingPassenger && setSeatPopoverOpen(false)}
        maxSeats={maxSeats}
        seatFare={seatFare}
        quickReserve={quickReserve}
        blockReason={passengerBlockReason}
        booking={bookingPassenger}
        onBook={handleBookPassenger}
      />

      <BookCourierPopover
        visible={courierPopoverOpen}
        onClose={() => !bookingCourier && setCourierPopoverOpen(false)}
        rideFrom={ride.from}
        rideTo={ride.to}
        blockReason={courierBlockReason}
        booking={bookingCourier}
        onBook={handleBookCourier}
      />
    </ScreenContainer>
  );
};

export default RideDetails;

const createStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    fixedHeader: {
      paddingHorizontal: LAYOUT.spacing.screen,
      paddingTop: LAYOUT.spacing.xs,
      marginBottom: LAYOUT.spacing.xs,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: LAYOUT.spacing.screen,
      paddingBottom: 32,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    centerText: { color: c.textMuted },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    loadingText: { fontSize: 13, color: c.textMuted },
    routeCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    routeDateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      flexWrap: "wrap",
    },
    routeDate: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSecondary,
      flex: 1,
    },
    timePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.primaryMuted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    timePillText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.primary,
    },
    routeStop: { flexDirection: "row", alignItems: "center", gap: 10 },
    routeDot: { width: 10, height: 10, borderRadius: 5 },
    routeCity: { fontSize: 17, fontWeight: "800", color: c.text, flex: 1 },
    routeLine: {
      width: 2,
      height: 20,
      backgroundColor: c.border,
      marginLeft: 4,
      marginVertical: 4,
    },
    statsRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    statChip: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    statChipCourier: {
      backgroundColor: c.tintOrange,
      borderColor: c.warningBorder,
    },
    statValueCourier: {
      color: c.warningText,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      marginTop: 4,
    },
    statLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: "600",
      marginTop: 2,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    driverCol: { flex: 1 },
    driverName: { fontSize: 17, fontWeight: "800", color: c.text },
    verifiedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    verified: { fontSize: 12, fontWeight: "600", color: c.successText },
    banner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 14,
      borderRadius: 14,
      marginBottom: 12,
    },
    bannerWarn: { backgroundColor: c.warningBg },
    bannerWarnText: {
      flex: 1,
      color: c.warningText,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 18,
    },
    bannerSuccess: { backgroundColor: c.successBg },
    bannerSuccessText: {
      flex: 1,
      color: c.successText,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 18,
    },
    bannerInfo: { backgroundColor: c.infoBg },
    bannerInfoText: {
      flex: 1,
      color: c.infoText,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 18,
    },
    bannerCourier: { backgroundColor: c.warningBg },
    bannerCourierText: {
      flex: 1,
      color: c.warningText,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 18,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: c.text,
      marginBottom: 10,
    },
    prefChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    prefChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.chipBg,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    prefChipText: { fontSize: 13, fontWeight: "600", color: c.textMuted },
    actionsBlock: { marginTop: 4 },
    actionsTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: c.text,
      marginBottom: 10,
    },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    actionCardDisabled: { opacity: 0.72 },
    actionIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    actionIconCourier: {
      backgroundColor: c.tintOrange,
    },
    actionTextCol: { flex: 1 },
    actionTitle: { fontSize: 16, fontWeight: "800", color: c.text },
    actionSub: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 4,
      lineHeight: 16,
    },
  });
