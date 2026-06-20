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
import LinearGradient from "react-native-linear-gradient";
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
import { formatVehicleLabel } from "./VehicleInfoStrip";
import KeyboardAwareScreen from "./ui/KeyboardAwareScreen";
import ScreenContainer from "./ui/ScreenContainer";
import ScreenHeader from "./ui/ScreenHeader";
import BookSeatPopover from "./ui/BookSeatPopover";
import BookCourierPopover from "./ui/BookCourierPopover";
import RideCorridorSegmentPicker from "./ui/RideCorridorSegmentPicker";
import {
  corridorHasSegments,
  defaultCorridorSegment,
  isValidCorridorSegment,
  resolveBookingSegmentFromContext,
} from "../Utils/rideCorridorUtils";
import { usePassengerSegmentFare } from "../hooks/usePassengerSegmentFare";
import { formatDisplayTime } from "../Utils/dateUtils";
import { LAYOUT } from "../theme/layout";
import { profileData } from "../Navigation/AuthNavigator";
import {
  bookingHighlightLabel,
  goToDashboardWithRideHighlight,
} from "../Utils/navigateToDashboardHighlight";
import {
  refUserId,
  getPassengerBookingBlockReason,
  getCourierBookingBlockReason,
  isUserPassengerOnRide,
  isUserCourierOnRide,
} from "../Utils/rideParticipantRole";

const RideDetails = ({ navigation, route }) => {
  const initialRide = route.params?.ride;
  const contextSegment = route.params?.searchSegment;
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    ProfileDetails,
    setRefreshUpcomingrides,
    setPendingHighlightRideId,
    setPendingHighlightLabel,
  } = profileData();

  const [rideInfo, setRideInfo] = useState(initialRide);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [seatPopoverOpen, setSeatPopoverOpen] = useState(false);
  const [courierPopoverOpen, setCourierPopoverOpen] = useState(false);
  const [bookingPassenger, setBookingPassenger] = useState(false);
  const [bookingCourier, setBookingCourier] = useState(false);
  const [bookingSegment, setBookingSegment] = useState(() =>
    defaultCorridorSegment(initialRide)
  );

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

  const corridorKey = useMemo(() => {
    const stops = (rideInfo?.stopovers || [])
      .map((stop) => stop?.label || stop?.name || "")
      .join("|");
    return `${rideInfo?._id || ""}|${rideInfo?.from || ""}|${rideInfo?.to || ""}|${stops}`;
  }, [rideInfo]);

  useEffect(() => {
    const fromContext = resolveBookingSegmentFromContext(
      rideInfo,
      contextSegment?.from,
      contextSegment?.to
    );
    if (fromContext) {
      setBookingSegment(fromContext);
      return;
    }
    setBookingSegment(defaultCorridorSegment(rideInfo));
  }, [corridorKey, rideInfo, contextSegment?.from, contextSegment?.to]);

  const ride = rideInfo;
  const isOwnRide =
    !!myUserId && !!ride?.creator && refUserId(ride.creator) === myUserId;
  const quickReserve = !!ride?.QuickReserve;
  const canCarryCourier = !!ride?.CanCarryCourier;
  const maxSeats = Math.max(0, Number(ride?.availableSeats) || 0);

  const displayBookingSegment = useMemo(() => {
    const fromContext = resolveBookingSegmentFromContext(
      ride,
      contextSegment?.from,
      contextSegment?.to
    );
    if (fromContext) return fromContext;
    if (isValidCorridorSegment(ride, bookingSegment.from, bookingSegment.to)) {
      return bookingSegment;
    }
    return defaultCorridorSegment(ride);
  }, [ride, bookingSegment, contextSegment?.from, contextSegment?.to]);

  const { perSeatFare: seatFare, segmentKm, fullRouteKm, fareHint: segmentFareHint, loading: segmentFareLoading } =
    usePassengerSegmentFare(ride, displayBookingSegment, 1);

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
  const hasCorridorSegments = corridorHasSegments(ride);
  const hasContextSegment = useMemo(
    () =>
      !!resolveBookingSegmentFromContext(
        ride,
        contextSegment?.from,
        contextSegment?.to
      ),
    [ride, contextSegment?.from, contextSegment?.to]
  );
  const showSegmentPicker = hasCorridorSegments && !hasContextSegment;

  const resolveBookingSegment = useCallback(() => {
    const fromContext = resolveBookingSegmentFromContext(
      ride,
      contextSegment?.from,
      contextSegment?.to
    );
    if (fromContext) return fromContext;
    if (!hasCorridorSegments) return null;
    if (isValidCorridorSegment(ride, bookingSegment.from, bookingSegment.to)) {
      return bookingSegment;
    }
    return defaultCorridorSegment(ride);
  }, [
    hasCorridorSegments,
    ride,
    bookingSegment,
    contextSegment?.from,
    contextSegment?.to,
  ]);

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

  const handleBookPassenger = async (seats, segment) => {
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
      const payload = {
        rideId: ride._id,
        requires_seats: seats,
      };
      const bookingSeg = segment || resolveBookingSegment();
      if (bookingSeg?.from && bookingSeg?.to) {
        payload.from = bookingSeg.from;
        payload.to = bookingSeg.to;
      }
      const response = await passengerSendRequestApi(token, payload);

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
                goToDashboardWithRideHighlight({
                  navigation,
                  rideId: ride._id,
                  label: bookingHighlightLabel(response.bookingStatus),
                  setRefreshUpcomingrides,
                  setPendingHighlightRideId,
                  setPendingHighlightLabel,
                }),
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

  const handleBookCourier = async (courierForm, segment) => {
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
        !courierForm.receiver_address
      ) {
        Alert.alert("Missing fields", "Please fill all required courier fields.");
        return;
      }

      if (!courierForm.courier_img) {
        Alert.alert("Photo required", "Upload a parcel photo first.");
        return;
      }

      setBookingCourier(true);
      const now = new Date();
      const bookingSeg = segment || resolveBookingSegment();
      const payload = {
        rideId: ride._id,
        from: bookingSeg?.from || ride.from,
        to: bookingSeg?.to || ride.to,
        courier_type: courierForm.courier_type,
        what_to_deliver: courierForm.what_to_deliver,
        courier_img: courierForm.courier_img,
        amount_will: Number(courierForm.amount_will),
        date: now.toISOString(),
        timeSlot: now.toISOString(),
        receiver_name: courierForm.receiver_name,
        receiver_mobile: courierForm.receiver_mobile,
        receiver_alternate_mobile:
          courierForm.receiver_alternate_mobile?.trim() ||
          courierForm.receiver_mobile,
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
                goToDashboardWithRideHighlight({
                  navigation,
                  rideId: ride._id,
                  label: bookingHighlightLabel(response.bookingStatus),
                  setRefreshUpcomingrides,
                  setPendingHighlightRideId,
                  setPendingHighlightLabel,
                }),
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
    if (
      showSegmentPicker &&
      !isValidCorridorSegment(ride, bookingSegment.from, bookingSegment.to)
    ) {
      Alert.alert(
        "Select your route",
        "Choose where you board and get off along this ride before booking."
      );
      return;
    }
    setSeatPopoverOpen(true);
  };

  const openCourierPopover = () => {
    if (courierBlockReason) {
      Alert.alert("Cannot book courier", courierBlockReason);
      return;
    }
    if (
      showSegmentPicker &&
      !isValidCorridorSegment(ride, bookingSegment.from, bookingSegment.to)
    ) {
      Alert.alert(
        "Select your route",
        "Choose pickup and drop-off towns along this ride before sending a parcel."
      );
      return;
    }
    setCourierPopoverOpen(true);
  };

  const vehicleLabel = formatVehicleLabel(ride?.vehicle);

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

          {/* Route hero — driver full route only */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={[colors.primary, "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroAccent}
            />
            <View style={styles.heroBody}>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaChip}>
                  <Icon name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={styles.heroMetaText}>{formattedRideDate}</Text>
                </View>
                <View style={styles.heroMetaChip}>
                  <Icon name="time-outline" size={14} color={colors.primary} />
                  <Text style={styles.heroMetaText}>{formattedRideTime}</Text>
                </View>
              </View>

              <View style={styles.heroRoute}>
                <View style={styles.heroTimeline}>
                  <View style={[styles.heroDot, styles.heroDotFrom]} />
                  <View style={styles.heroLine} />
                  <View style={[styles.heroDot, styles.heroDotTo]} />
                </View>
                <View style={styles.heroRouteCol}>
                  <View style={styles.heroRoutePoint}>
                    <Text style={styles.heroRouteLabel}>From</Text>
                    <Text style={styles.heroCity} numberOfLines={2}>
                      {ride.from || "—"}
                    </Text>
                  </View>
                  <View style={styles.heroRoutePoint}>
                    <Text style={styles.heroRouteLabel}>To</Text>
                    <Text style={styles.heroCity} numberOfLines={2}>
                      {ride.to || "—"}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroPrice}>
                  <Text style={styles.heroPriceLabel}>
                    {hasContextSegment || showSegmentPicker ? "your segment" : "per seat"}
                  </Text>
                  <Text style={styles.heroPriceValue}>
                    {segmentFareLoading ? "…" : `₹${seatFare}`}
                  </Text>
                  {segmentKm != null && !segmentFareLoading ? (
                    <Text style={styles.heroPriceKm}>
                      {segmentKm.toFixed(1)} km
                      {fullRouteKm != null &&
                      Math.abs(fullRouteKm - segmentKm) > 0.5
                        ? ` of ${fullRouteKm.toFixed(1)} km`
                        : ""}
                    </Text>
                  ) : segmentFareLoading ? (
                    <Text style={styles.heroPriceKm}>Loading km…</Text>
                  ) : null}
                  {segmentFareHint && !segmentFareLoading && segmentKm == null ? (
                    <Text style={styles.heroPriceHint} numberOfLines={2}>
                      {segmentFareHint}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Icon name="people-outline" size={16} color={colors.primary} />
                  <Text style={styles.heroStatText}>
                    {maxSeats} seat{maxSeats !== 1 ? "s" : ""} left
                  </Text>
                </View>
                {canCarryCourier ? (
                  <View style={[styles.heroStat, styles.heroStatCourier]}>
                    <Icon name="cube-outline" size={16} color={colors.warningText} />
                    <Text style={[styles.heroStatText, styles.heroStatCourierText]}>
                      Courier OK
                    </Text>
                  </View>
                ) : null}
                {quickReserve ? (
                  <View style={[styles.heroStat, styles.heroStatQuick]}>
                    <Icon name="flash" size={16} color={colors.successText} />
                    <Text style={[styles.heroStatText, styles.heroStatQuickText]}>
                      Quick Reserve
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Driver */}
          <View style={styles.driverCard}>
            <UserAvatar user={ride.creator} size={52} borderColor={colors.border} />
            <View style={styles.driverCol}>
              <Text style={styles.driverName}>{ride.creator?.name || "Driver"}</Text>
              <View style={styles.verifiedRow}>
                <Icon name="shield-checkmark" size={13} color={colors.successText} />
                <Text style={styles.verified}>Verified driver</Text>
              </View>
              {vehicleLabel ? (
                <Text style={styles.vehicleLine} numberOfLines={1}>
                  {vehicleLabel}
                  {ride.vehicle?.car_no ? ` · ${ride.vehicle.car_no}` : ""}
                </Text>
              ) : null}
            </View>
          </View>
          {ride.vehicle ? (
            <View style={styles.vehicleCard}>
              <VehicleInfoStrip vehicle={ride.vehicle} compact />
            </View>
          ) : null}

          {/* Status */}
          {isOwnRide ? (
            <View style={[styles.statusBanner, styles.statusInfo]}>
              <Icon name="car-sport" size={18} color={colors.infoText} />
              <Text style={styles.statusInfoText}>
                Your ride — manage bookings from Upcoming Rides.
              </Text>
            </View>
          ) : onRideAsPassenger ? (
            <View style={[styles.statusBanner, styles.statusSuccess]}>
              <Icon name="checkmark-circle" size={18} color={colors.successText} />
              <Text style={styles.statusSuccessText}>You're on this ride as a passenger.</Text>
            </View>
          ) : onRideAsCourier ? (
            <View style={[styles.statusBanner, styles.statusCourier]}>
              <Icon name="cube" size={18} color={colors.warningText} />
              <Text style={styles.statusCourierText}>You're on this ride as a courier.</Text>
            </View>
          ) : quickReserve ? (
            <View style={[styles.statusBanner, styles.statusSuccess]}>
              <Icon name="flash" size={18} color={colors.successText} />
              <Text style={styles.statusSuccessText}>Instant confirmation when you book.</Text>
            </View>
          ) : (
            <View style={[styles.statusBanner, styles.statusWarn]}>
              <Icon name="hourglass-outline" size={18} color={colors.warningText} />
              <Text style={styles.statusWarnText}>Driver approval required after you request.</Text>
            </View>
          )}

          {/* Join + segment picker */}
          {!isOwnRide ? (
            <View style={styles.joinCard}>
              <View style={styles.joinHeader}>
                <Text style={styles.joinTitle}>Join this ride</Text>
                <Text style={styles.joinSub}>
                  {hasContextSegment
                    ? "Your search route is used for seat and courier booking."
                    : showSegmentPicker
                      ? "Pick your route segment, then book a seat or send a parcel."
                      : "Book a seat or courier delivery on this route."}
                </Text>
              </View>

              {hasContextSegment ? (
                <View style={styles.searchRouteCard}>
                  <Icon name="navigate" size={18} color={colors.primary} />
                  <View style={styles.searchRouteTextCol}>
                    <Text style={styles.searchRouteLabel}>Your route</Text>
                    <Text style={styles.searchRouteValue} numberOfLines={2}>
                      {bookingSegment.from} → {bookingSegment.to}
                    </Text>
                  </View>
                </View>
              ) : showSegmentPicker ? (
                <RideCorridorSegmentPicker
                  ride={ride}
                  value={bookingSegment}
                  onChange={setBookingSegment}
                  disabled={!!passengerBlockReason && !!courierBlockReason}
                />
              ) : null}

              <View style={styles.joinActions}>
                <TouchableOpacity
                  style={[
                    styles.joinBtn,
                    styles.joinBtnPassenger,
                    passengerBlockReason && styles.joinBtnDisabled,
                  ]}
                  onPress={openSeatPopover}
                  activeOpacity={0.88}
                  disabled={!!passengerBlockReason}
                >
                  <View style={[styles.joinBtnIcon, { backgroundColor: colors.successBg }]}>
                    <Icon name="person-add" size={22} color={colors.successText} />
                  </View>
                  <View style={styles.joinBtnText}>
                    <Text style={styles.joinBtnTitle}>Book a seat</Text>
                    <Text style={styles.joinBtnSub} numberOfLines={2}>
                      {passengerBlockReason ||
                        (segmentFareLoading
                          ? "Calculating fare…"
                          : `${maxSeats} available · ₹${seatFare}${
                              segmentKm != null ? ` · ${segmentKm.toFixed(1)} km` : ""
                            }`)}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={passengerBlockReason ? colors.textMuted : colors.successText}
                  />
                </TouchableOpacity>

                {canCarryCourier ? (
                  <TouchableOpacity
                    style={[
                      styles.joinBtn,
                      styles.joinBtnCourier,
                      courierBlockReason && styles.joinBtnDisabled,
                    ]}
                    onPress={openCourierPopover}
                    activeOpacity={0.88}
                    disabled={!!courierBlockReason}
                  >
                    <View style={[styles.joinBtnIcon, { backgroundColor: colors.tintOrange }]}>
                      <Icon name="cube" size={22} color={colors.warningText} />
                    </View>
                    <View style={styles.joinBtnText}>
                      <Text style={styles.joinBtnTitle}>Send a parcel</Text>
                      <Text style={styles.joinBtnSub} numberOfLines={2}>
                        {courierBlockReason || "Courier delivery along this ride"}
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
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAwareScreen>

      <BookSeatPopover
        visible={seatPopoverOpen}
        onClose={() => !bookingPassenger && setSeatPopoverOpen(false)}
        ride={ride}
        maxSeats={maxSeats}
        quickReserve={quickReserve}
        blockReason={passengerBlockReason}
        booking={bookingPassenger}
        segment={displayBookingSegment}
        hideSegmentPicker={hasContextSegment || showSegmentPicker}
        perSeatFare={seatFare}
        segmentKm={segmentKm}
        fullRouteKm={fullRouteKm}
        fareHint={segmentFareHint}
        fareLoading={segmentFareLoading}
        onBook={handleBookPassenger}
      />

      <BookCourierPopover
        visible={courierPopoverOpen}
        onClose={() => !bookingCourier && setCourierPopoverOpen(false)}
        ride={ride}
        blockReason={courierBlockReason}
        booking={bookingCourier}
        segment={bookingSegment}
        hideSegmentPicker={hasContextSegment || showSegmentPicker}
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
      gap: 12,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    centerText: { color: c.textMuted },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    loadingText: { fontSize: 13, color: c.textMuted },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 4,
    },
    heroAccent: { height: 4, width: "100%" },
    heroBody: { padding: 16 },
    heroMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },
    heroMetaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.primaryMuted,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    heroMetaText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.primary,
    },
    heroRoute: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 10,
      marginBottom: 14,
    },
    heroTimeline: {
      width: 12,
      alignItems: "center",
      paddingVertical: 4,
    },
    heroDot: { width: 10, height: 10, borderRadius: 5 },
    heroDotFrom: { backgroundColor: "#22C55E" },
    heroDotTo: { backgroundColor: "#F97316" },
    heroLine: {
      flex: 1,
      width: 2,
      backgroundColor: c.border,
      marginVertical: 4,
      minHeight: 28,
    },
    heroRouteCol: { flex: 1, justifyContent: "space-between", gap: 12 },
    heroRoutePoint: { gap: 2 },
    heroRouteLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    heroCity: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      lineHeight: 20,
    },
    heroPrice: {
      alignItems: "flex-end",
      justifyContent: "center",
      minWidth: 56,
    },
    heroPriceLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: c.textMuted,
      textTransform: "uppercase",
    },
    heroPriceValue: {
      fontSize: 20,
      fontWeight: "900",
      color: c.primary,
      marginTop: 2,
    },
    heroPriceKm: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      marginTop: 3,
      textAlign: "right",
    },
    heroPriceHint: {
      fontSize: 9,
      fontWeight: "600",
      color: c.textMuted,
      marginTop: 2,
      textAlign: "right",
      maxWidth: 88,
    },
    heroStats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    heroStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.chipBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    heroStatCourier: { backgroundColor: c.tintOrange },
    heroStatQuick: { backgroundColor: c.successBg },
    heroStatText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textSecondary,
    },
    heroStatCourierText: { color: c.warningText },
    heroStatQuickText: { color: c.successText },
    driverCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    driverCol: { flex: 1 },
    driverName: { fontSize: 17, fontWeight: "800", color: c.text },
    verifiedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
    },
    verified: { fontSize: 11, fontWeight: "600", color: c.successText },
    vehicleLine: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 4,
      fontWeight: "600",
    },
    vehicleCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: -4,
    },
    statusBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 14,
    },
    statusWarn: { backgroundColor: c.warningBg },
    statusWarnText: {
      flex: 1,
      color: c.warningText,
      fontWeight: "600",
      fontSize: 12,
      lineHeight: 17,
    },
    statusSuccess: { backgroundColor: c.successBg },
    statusSuccessText: {
      flex: 1,
      color: c.successText,
      fontWeight: "600",
      fontSize: 12,
      lineHeight: 17,
    },
    statusInfo: { backgroundColor: c.infoBg },
    statusInfoText: {
      flex: 1,
      color: c.infoText,
      fontWeight: "600",
      fontSize: 12,
      lineHeight: 17,
    },
    statusCourier: { backgroundColor: c.tintOrange },
    statusCourierText: {
      flex: 1,
      color: c.warningText,
      fontWeight: "600",
      fontSize: 12,
      lineHeight: 17,
    },
    joinCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 4,
    },
    joinHeader: { marginBottom: 12 },
    joinTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    joinSub: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 4,
      lineHeight: 17,
    },
    searchRouteCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.primaryMuted,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchRouteTextCol: { flex: 1 },
    searchRouteLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 2,
    },
    searchRouteValue: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
    },
    joinActions: { gap: 10, marginTop: 4 },
    joinBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.chipBg,
    },
    joinBtnPassenger: {
      borderLeftWidth: 3,
      borderLeftColor: c.successText,
    },
    joinBtnCourier: {
      borderLeftWidth: 3,
      borderLeftColor: c.warningText,
    },
    joinBtnDisabled: { opacity: 0.65 },
    joinBtnIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    joinBtnText: { flex: 1 },
    joinBtnTitle: { fontSize: 15, fontWeight: "800", color: c.text },
    joinBtnSub: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 3,
      lineHeight: 16,
    },
  });
