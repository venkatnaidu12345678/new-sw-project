import React, { useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import UserAvatar from "./ui/UserAvatar";
import { VehicleInlineBar } from "./VehicleInfoStrip";
import { resolveRideVehicle } from "../Utils/vehicleDisplayUtils";
import { LAYOUT, scale } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { RideListSkeleton } from "./ui/Skeleton";
import AnimatedLoad from "./ui/AnimatedLoad";
import AdPlacement from "./ads/AdPlacement";
import {
  formatDisplayDate,
  formatRideTimeLabel,
} from "../Utils/dateUtils";
import { usePassengerSegmentFare } from "../hooks/usePassengerSegmentFare";
import {
  resolveBookingSegmentFromContext,
  segmentDiffersFromFullRide,
} from "../Utils/rideCorridorUtils";

const refId = (ref) =>
  ref?._id?.toString?.() || ref?.toString?.() || "";

const MetaChip = ({ icon, label }) => {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.metaChip}>
      <Icon name={icon} size={11} color={colors.textMuted} />
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
};

const SearchRideCard = ({ item, onPress, searchSegment }) => {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const seats = item?.availableSeats ?? 0;
  const vehicle = resolveRideVehicle(item);
  const stopoverCount = Array.isArray(item?.stopovers) ? item.stopovers.length : 0;

  const resolvedSegment = useMemo(() => {
    if (!searchSegment?.from || !searchSegment?.to) return null;
    return resolveBookingSegmentFromContext(
      item,
      searchSegment.from,
      searchSegment.to
    );
  }, [item, searchSegment?.from, searchSegment?.to]);

  const hasPassengerSegment =
    resolvedSegment && segmentDiffersFromFullRide(item, resolvedSegment);

  const fareSegment = useMemo(() => {
    if (hasPassengerSegment) return resolvedSegment;
    return { from: item?.from, to: item?.to };
  }, [hasPassengerSegment, resolvedSegment, item?.from, item?.to]);

  const { perSeatFare, segmentKm, fullRouteKm, loading: fareLoading } =
    usePassengerSegmentFare(item, fareSegment, 1);

  const displayFrom = hasPassengerSegment ? resolvedSegment.from : item.from || "—";
  const displayTo = hasPassengerSegment ? resolvedSegment.to : item.to || "—";
  const timeLabel = formatRideTimeLabel(item?.date, item?.startTime);
  const dateLabel = formatDisplayDate(item?.date, { weekday: false }) || "—";

  const kmText = fareLoading
    ? "…"
    : segmentKm != null
      ? `${segmentKm.toFixed(1)} km`
      : null;

  return (
    <TouchableOpacity style={styles.cardOuter} activeOpacity={0.9} onPress={onPress}>
      <View
        style={[
          styles.cardAccent,
          hasPassengerSegment ? styles.cardAccentSegment : styles.cardAccentFull,
        ]}
      />

      <View style={styles.cardBody}>
        {/* Driver + fare */}
        <View style={styles.topRow}>
          <UserAvatar user={item?.creator} size={42} borderColor={colors.border} />
          <View style={styles.topCenter}>
            <Text style={styles.driverName} numberOfLines={1}>
              {item?.creator?.name || "Driver"}
            </Text>
          </View>
          <View style={styles.fareBox}>
            <Text style={styles.fareLabel}>
              {hasPassengerSegment ? "Segment" : "Per seat"}
            </Text>
            <Text style={styles.fareValue}>{fareLoading ? "…" : `₹${perSeatFare}`}</Text>
            {kmText ? (
              <View style={styles.fareKmRow}>
                <Icon name="navigate-outline" size={10} color={colors.primary} />
                <Text style={styles.fareKm}>{kmText}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Tags */}
        {(hasPassengerSegment || item?.QuickReserve || item?.CanCarryCourier) ? (
          <View style={styles.tagRow}>
            {hasPassengerSegment ? (
              <View style={styles.segmentTag}>
                <Icon name="checkmark-circle" size={12} color={colors.successText} />
                <Text style={styles.segmentTagText}>Your search segment</Text>
              </View>
            ) : null}
            {item?.QuickReserve ? (
              <View style={[styles.tag, styles.tagSuccess]}>
                <Icon name="flash" size={11} color={colors.successText} />
                <Text style={[styles.tagText, { color: colors.successText }]}>Quick</Text>
              </View>
            ) : null}
            {item?.CanCarryCourier ? (
              <View style={[styles.tag, styles.tagWarning]}>
                <Icon name="cube-outline" size={11} color={colors.warningText} />
                <Text style={[styles.tagText, { color: colors.warningText }]}>Courier</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Route */}
        <View style={styles.routePanel}>
          <View style={styles.routeBlock}>
            <View style={styles.routeTimeline}>
              <View style={[styles.routeDot, styles.routeDotFrom]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, styles.routeDotTo]} />
            </View>
            <View style={styles.routeTextCol}>
              <View style={styles.routePoint}>
                <Text style={styles.routeLabel}>
                  {hasPassengerSegment ? "Your pickup" : "From"}
                </Text>
                <Text style={styles.routeCity} numberOfLines={2}>
                  {displayFrom}
                </Text>
              </View>
              <View style={[styles.routePoint, styles.routePointLast]}>
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text style={styles.routeCity} numberOfLines={2}>
                  {displayTo}
                </Text>
              </View>
            </View>
          </View>

          {hasPassengerSegment ? (
            <View style={styles.driverRouteRow}>
              <Icon name="car-outline" size={12} color={colors.textMuted} />
              <Text style={styles.driverRouteText} numberOfLines={2}>
                Driver route: {item.from} → {item.to}
                {fullRouteKm != null && !fareLoading
                  ? ` (${fullRouteKm.toFixed(1)} km)`
                  : ""}
              </Text>
            </View>
          ) : stopoverCount > 0 ? (
            <View style={styles.driverRouteRow}>
              <Icon name="git-commit-outline" size={12} color={colors.primary} />
              <Text style={styles.driverRouteText}>
                {stopoverCount} stopover{stopoverCount !== 1 ? "s" : ""} on route
              </Text>
            </View>
          ) : null}
        </View>

        {vehicle ? (
          <View style={styles.vehicleBarWrap}>
            <VehicleInlineBar vehicle={vehicle} />
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footerRow}>
          <View style={styles.metaRow}>
            <MetaChip icon="time-outline" label={timeLabel} />
            <MetaChip icon="calendar-outline" label={dateLabel} />
            <MetaChip
              icon="people-outline"
              label={`${seats} seat${seats !== 1 ? "s" : ""}`}
            />
          </View>
          <View style={styles.viewLink}>
            <Text style={styles.viewLinkText}>View</Text>
            <Icon name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EmptyResults = () => {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIcon}>
      <Icon name="car-outline" size={40} color={colors.textMuted} />
    </View>
    <Text style={styles.emptyTitle}>No rides found</Text>
    <Text style={styles.emptySub}>
      Try a different date or nearby cities for more options.
    </Text>
  </View>
  );
};

const AllridesComponent = ({
  rides = [],
  loading,
  navigation,
  currentUserId,
  searchFrom = "",
  searchTo = "",
  headerContent = null,
}) => {
  const styles = useThemedStyles(createStyles);
  const visibleRides = (rides || []).filter((item) => {
    if (!currentUserId) return true;
    return refId(item?.creator) !== refId(currentUserId);
  });

  const searchSegment = useMemo(() => {
    const from = String(searchFrom || "").trim();
    const to = String(searchTo || "").trim();
    if (!from || !to) return null;
    return { from, to };
  }, [searchFrom, searchTo]);

  const renderRide = useCallback(
    ({ item }) => (
      <SearchRideCard
        item={item}
        searchSegment={searchSegment}
        onPress={() =>
          navigation.navigate("RideDetails", {
            ride: item,
            ...(searchSegment ? { searchSegment } : {}),
          })
        }
      />
    ),
    [navigation, searchSegment]
  );

  const resultLabel =
    visibleRides.length > 0 ? (
      <Text style={styles.resultCount}>
        {visibleRides.length} ride
        {visibleRides.length !== 1 ? "s" : ""} available
      </Text>
    ) : null;

  const fixedHeader = (
    <View style={styles.fixedHeader}>
      {headerContent}
      {resultLabel}
    </View>
  );

  const cardsList = (
    <FlatList
      data={visibleRides}
      ListFooterComponent={<AdPlacement placement="search_results" />}
      keyExtractor={(item, index) =>
        item?._id ? item._id.toString() : index.toString()
      }
      renderItem={renderRide}
      showsVerticalScrollIndicator={false}
      style={styles.cardsList}
      contentContainerStyle={styles.listContent}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );

  if (!loading && visibleRides.length === 0) {
    return (
      <View style={styles.listRoot}>
        {fixedHeader}
        <View style={styles.cardsArea}>
          <EmptyResults />
        </View>
      </View>
    );
  }

  if (loading && visibleRides.length === 0) {
    return (
      <View style={styles.listRoot}>
        {fixedHeader}
        <View style={[styles.cardsArea, styles.skeletonWrap]}>
          <RideListSkeleton count={4} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.listRoot}>
      {fixedHeader}
      <AnimatedLoad
        loading={loading}
        skeleton={
          <View style={[styles.cardsArea, styles.skeletonWrap]}>
            <RideListSkeleton count={4} />
          </View>
        }
        style={styles.cardsArea}
      >
        {cardsList}
      </AnimatedLoad>
    </View>
  );
};

export default React.memo(AllridesComponent);

const createStyles = (c) =>
  StyleSheet.create({
  listRoot: {
    flex: 1,
  },
  fixedHeader: {
    flexShrink: 0,
    zIndex: 20,
    overflow: "visible",
  },
  cardsArea: {
    flex: 1,
    minHeight: 0,
  },
  cardsList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.xs,
    paddingBottom: LAYOUT.spacing.xl + 80,
    flexGrow: 1,
  },
  resultCount: {
    fontSize: LAYOUT.font.small,
    fontWeight: "700",
    color: c.textMuted,
    marginBottom: LAYOUT.spacing.xs,
    marginTop: LAYOUT.spacing.xs,
    marginLeft: LAYOUT.spacing.md + 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  skeletonWrap: {
    padding: LAYOUT.spacing.md,
  },

  cardOuter: {
    marginBottom: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: "hidden",
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardAccent: {
    height: 4,
    width: "100%",
  },
  cardAccentFull: {
    backgroundColor: c.primary,
  },
  cardAccentSegment: {
    backgroundColor: "#10B981",
  },
  cardBody: {
    padding: LAYOUT.spacing.md,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  topCenter: {
    flex: 1,
    minWidth: 0,
  },
  driverName: {
    fontSize: LAYOUT.font.body,
    fontWeight: "800",
    color: c.text,
  },
  fareBox: {
    alignItems: "flex-end",
    backgroundColor: c.primaryMuted,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: c.border,
    minWidth: 68,
  },
  fareLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fareValue: {
    fontSize: LAYOUT.font.title,
    fontWeight: "900",
    color: c.primary,
    marginTop: 1,
  },
  fareKmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  fareKm: {
    fontSize: LAYOUT.font.tiny,
    fontWeight: "700",
    color: c.primary,
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  segmentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  segmentTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: c.successText,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagSuccess: {
    backgroundColor: c.successBg,
  },
  tagWarning: {
    backgroundColor: c.warningBg,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
  },

  routePanel: {
    backgroundColor: c.chipBg,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    marginBottom: 10,
  },
  routeBlock: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  routeTimeline: {
    alignItems: "center",
    width: 14,
    paddingTop: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: c.surface,
  },
  routeDotFrom: {
    backgroundColor: "#22C55E",
  },
  routeDotTo: {
    backgroundColor: "#EF4444",
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 22,
    backgroundColor: c.border,
    marginVertical: 3,
  },
  routeTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  routePoint: {
    marginBottom: 10,
  },
  routePointLast: {
    marginBottom: 0,
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeCity: {
    fontSize: LAYOUT.font.section,
    fontWeight: "800",
    color: c.text,
    lineHeight: 20,
  },

  driverRouteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  driverRouteText: {
    flex: 1,
    fontSize: LAYOUT.font.small,
    fontWeight: "600",
    color: c.textMuted,
    lineHeight: 17,
  },

  vehicleBarWrap: {
    marginBottom: 10,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  metaChipText: {
    fontSize: LAYOUT.font.tiny,
    fontWeight: "700",
    color: c.textMuted,
  },
  viewLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 8,
  },
  viewLinkText: {
    fontSize: LAYOUT.font.small,
    fontWeight: "800",
    color: c.primary,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: LAYOUT.spacing.xl,
    paddingVertical: scale(48),
  },
  emptyIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: LAYOUT.spacing.md,
  },
  emptyTitle: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    color: c.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: LAYOUT.font.body,
    color: c.textMuted,
    textAlign: "center",
    lineHeight: scale(22),
  },
});
