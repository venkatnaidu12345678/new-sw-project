import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FormPopoverShell from "./FormPopoverShell";
import RideCorridorSegmentPicker from "./RideCorridorSegmentPicker";
import { getSegmentBookingFareDisplay } from "../../Utils/bookingFareUtils";
import { defaultCorridorSegment, corridorHasSegments } from "../../Utils/rideCorridorUtils";
import { usePassengerSegmentFare } from "../../hooks/usePassengerSegmentFare";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

/**
 * Book a seat on a driver ride — uses admin segment fare only.
 * Passenger request offers (My Request) are handled separately elsewhere.
 */
const BookSeatPopover = ({
  visible,
  onClose,
  ride,
  maxSeats,
  quickReserve,
  blockReason,
  booking,
  segment: externalSegment,
  hideSegmentPicker = false,
  /** Segment per-seat fare already shown on RideDetails (not a passenger request offer). */
  segmentPerSeatFromPage = 0,
  segmentKmFromPage,
  fullRouteKmFromPage,
  segmentFareHintFromPage = "",
  segmentFareLoadingFromPage = false,
  onBook,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [seats, setSeats] = useState(1);
  const [internalSegment, setInternalSegment] = useState(() =>
    defaultCorridorSegment(ride)
  );
  const showSegmentPicker =
    !hideSegmentPicker && corridorHasSegments(ride);

  const activeSegment = showSegmentPicker
    ? internalSegment
    : (externalSegment ?? internalSegment);

  const segmentAligned =
    !!externalSegment &&
    String(activeSegment?.from || "") === String(externalSegment.from || "") &&
    String(activeSegment?.to || "") === String(externalSegment.to || "");

  const {
    perSeatFare: quotedSegmentPerSeat,
    segmentKm: quotedSegmentKm,
    fullRouteKm: quotedFullRouteKm,
    fareHint: quotedSegmentFareHint,
    loading: quoteLoading,
  } = usePassengerSegmentFare(ride, activeSegment, seats, { enabled: visible });

  const usePageSegmentSeed =
    visible &&
    segmentAligned &&
    quoteLoading &&
    Number(segmentPerSeatFromPage) > 0;

  const segmentPerSeat = usePageSegmentSeed
    ? Math.round(Number(segmentPerSeatFromPage))
    : Math.round(Number(quotedSegmentPerSeat) || 0);
  const displaySegmentKm = usePageSegmentSeed ? segmentKmFromPage : quotedSegmentKm;
  const displayFullRouteKm = usePageSegmentSeed
    ? fullRouteKmFromPage
    : quotedFullRouteKm;
  const displaySegmentFareHint = usePageSegmentSeed
    ? segmentFareHintFromPage
    : quotedSegmentFareHint;
  const isFareLoading =
    visible && (segmentFareLoadingFromPage || quoteLoading) && !usePageSegmentSeed;

  const { total: totalFare, hint: bookingFareHint } = getSegmentBookingFareDisplay(
    segmentPerSeat,
    seats
  );
  const displayFareHint = displaySegmentFareHint || bookingFareHint;

  useEffect(() => {
    if (visible) {
      setSeats(1);
    }
  }, [visible, ride?._id]);

  useEffect(() => {
    if (externalSegment?.from && externalSegment?.to) {
      setInternalSegment(externalSegment);
      return;
    }
    if (visible && ride) {
      setInternalSegment(defaultCorridorSegment(ride));
    }
  }, [
    visible,
    ride?._id,
    ride?.from,
    ride?.to,
    ride?.stopovers,
    externalSegment?.from,
    externalSegment?.to,
  ]);

  useEffect(() => {
    if (maxSeats > 0 && seats > maxSeats) setSeats(maxSeats);
  }, [maxSeats, seats]);

  const canBook =
    !blockReason &&
    maxSeats >= 1 &&
    !booking &&
    !isFareLoading &&
    segmentPerSeat > 0;

  return (
    <FormPopoverShell visible={visible} onClose={onClose} disabledClose={booking}>
      <View style={styles.handle} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.successBg }]}>
            <Icon name="people" size={22} color={colors.successText} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Book a seat</Text>
            <Text style={styles.subtitle}>
              {quickReserve
                ? "Quick Reserve — confirmed instantly"
                : "Driver approval required"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} disabled={booking}>
            <Icon name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {blockReason ? (
          <View style={styles.blockBox}>
            <Icon name="information-circle" size={20} color={colors.warningText} />
            <Text style={styles.blockText}>{blockReason}</Text>
          </View>
        ) : null}

        {showSegmentPicker ? (
          <RideCorridorSegmentPicker
            ride={ride}
            value={activeSegment}
            onChange={setInternalSegment}
            disabled={!!blockReason || booking}
          />
        ) : hideSegmentPicker && corridorHasSegments(ride) ? (
          <View style={styles.segmentSummary}>
            <Icon name="navigate-outline" size={14} color={colors.successText} />
            <Text style={styles.segmentSummaryText} numberOfLines={2}>
              Your trip: {activeSegment.from} → {activeSegment.to}
            </Text>
          </View>
        ) : null}

        <View style={styles.seatCard}>
          <Text style={styles.seatLabel}>Seats</Text>
          <View style={styles.seatRow}>
            <TouchableOpacity
              style={[styles.seatBtn, seats <= 1 && styles.seatBtnDisabled]}
              onPress={() => setSeats((s) => Math.max(1, s - 1))}
              disabled={seats <= 1 || !!blockReason}
            >
              <Icon name="remove" size={22} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.seatCount}>
              {maxSeats < 1 ? "No seats" : `${seats} of ${maxSeats}`}
            </Text>
            <TouchableOpacity
              style={[styles.seatBtn, seats >= maxSeats && styles.seatBtnDisabled]}
              onPress={() => setSeats((s) => Math.min(maxSeats, s + 1))}
              disabled={seats >= maxSeats || maxSeats < 1 || !!blockReason}
            >
              <Icon name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {isFareLoading ? (
            <View style={styles.fareLoadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.fareLoadingText}>
                {displaySegmentKm != null
                  ? `Calculating fare · ${displaySegmentKm.toFixed(1)} km…`
                  : "Calculating segment fare…"}
              </Text>
            </View>
          ) : (
            <>
              {displaySegmentKm != null ? (
                <Text style={styles.segmentKmText}>
                  Your trip: {displaySegmentKm.toFixed(1)} km
                  {displayFullRouteKm != null &&
                  Math.abs(displayFullRouteKm - displaySegmentKm) > 0.5
                    ? ` of ${displayFullRouteKm.toFixed(1)} km route`
                    : ""}
                </Text>
              ) : null}
              <Text style={styles.fareLine}>
                ₹{segmentPerSeat}/seat × {seats} = ₹{totalFare}
              </Text>
              {displayFareHint ? (
                <Text style={styles.fareHintText}>{displayFareHint}</Text>
              ) : null}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, !canBook && styles.primaryBtnDisabled]}
          onPress={() => onBook?.(seats, activeSegment, segmentPerSeat)}
          disabled={!canBook}
          activeOpacity={0.88}
        >
          {booking ? (
            <ActivityIndicator color={colors.inverseText} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {quickReserve
                ? `Confirm booking · ₹${totalFare}`
                : `Send request · ₹${totalFare}`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </FormPopoverShell>
  );
};

export default BookSeatPopover;

const createStyles = (c) =>
  StyleSheet.create({
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 8,
    },
    content: { paddingHorizontal: 20, paddingBottom: 28 },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
      gap: 12,
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
      marginBottom: 14,
      alignItems: "flex-start",
    },
    blockText: {
      flex: 1,
      color: c.warningText,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 18,
    },
    segmentSummary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.successBg,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentSummaryText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
    seatCard: {
      backgroundColor: c.chipBg,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    seatLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 10,
    },
    seatRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    seatBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    seatBtnDisabled: { opacity: 0.35 },
    seatCount: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      minWidth: 100,
      textAlign: "center",
    },
    fareLoadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 12,
    },
    fareLoadingText: {
      fontSize: 13,
      color: c.textMuted,
      fontWeight: "600",
    },
    segmentKmText: {
      textAlign: "center",
      marginTop: 12,
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
    },
    fareLine: {
      textAlign: "center",
      marginTop: 8,
      fontSize: 14,
      fontWeight: "700",
      color: c.primary,
    },
    fareHintText: {
      textAlign: "center",
      marginTop: 6,
      fontSize: 11,
      fontWeight: "600",
      color: c.textMuted,
    },
    primaryBtn: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: {
      color: c.inverseText,
      fontWeight: "800",
      fontSize: 15,
    },
  });
