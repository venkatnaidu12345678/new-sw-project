import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";

import UserAvatar from "./ui/UserAvatar";
import { formatVehicleLabel } from "./VehicleInfoStrip";
import { LAYOUT, scale } from "../theme/layout";
import { DS } from "../theme/designSystem";
import { RideListSkeleton } from "./ui/Skeleton";
import AnimatedLoad from "./ui/AnimatedLoad";
import AdPlacement from "./ads/AdPlacement";
import {
  formatDisplayDate,
  formatRideTimeLabel,
} from "../Utils/dateUtils";

const refId = (ref) =>
  ref?._id?.toString?.() || ref?.toString?.() || "";

const MetaChip = ({ icon, label }) => (
  <View style={styles.metaChip}>
    <Icon name={icon} size={13} color="#64748B" />
    <Text style={styles.metaChipText}>{label}</Text>
  </View>
);

const SearchRideCard = ({ item, onPress }) => {
  const seats = item?.availableSeats ?? 0;
  const price = item?.ride_amount ?? 0;
  const vehicleLabel = formatVehicleLabel(item?.vehicle);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={onPress}
    >
      <LinearGradient
        colors={["#2563EB", "#4F46E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />

      <View style={styles.cardBody}>
        {/* Route */}
        <View style={styles.routeBlock}>
          <View style={styles.routeTimeline}>
            <View style={[styles.routeDot, styles.routeDotFrom]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.routeDotTo]} />
          </View>
          <View style={styles.routeTextCol}>
            <View style={styles.routePoint}>
              <Text style={styles.routeLabel}>From</Text>
              <Text style={styles.routeCity} numberOfLines={1}>
                {item.from || "—"}
              </Text>
            </View>
            <View style={[styles.routePoint, styles.routePointTo]}>
              <Text style={styles.routeLabel}>To</Text>
              <Text style={styles.routeCity} numberOfLines={1}>
                {item.to || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>per seat</Text>
            <Text style={styles.priceValue}>₹{price}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Driver */}
        <View style={styles.driverRow}>
          <UserAvatar user={item?.creator} size={44} borderColor="#E2E8F0" />
          <View style={styles.driverCol}>
            <Text style={styles.driverName} numberOfLines={1}>
              {item?.creator?.name || "Driver"}
            </Text>
            {vehicleLabel ? (
              <Text style={styles.vehicleText} numberOfLines={1}>
                {vehicleLabel}
                {item?.vehicle?.car_no ? ` · ${item.vehicle.car_no}` : ""}
              </Text>
            ) : (
              <Text style={styles.vehicleText}>Vehicle details on request</Text>
            )}
          </View>
          <View style={styles.chevronWrap}>
            <Icon name="chevron-forward" size={20} color="#94A3B8" />
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <MetaChip
            icon="time-outline"
            label={formatRideTimeLabel(item?.date, item?.startTime)}
          />
          <MetaChip
            icon="calendar-outline"
            label={formatDisplayDate(item?.date, { weekday: false }) || "—"}
          />
          <MetaChip
            icon="people-outline"
            label={`${seats} seat${seats !== 1 ? "s" : ""}`}
          />
        </View>

        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Tap to view & request</Text>
          <Icon name="arrow-forward-circle" size={18} color={DS.colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EmptyResults = () => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIcon}>
      <Icon name="car-outline" size={40} color="#94A3B8" />
    </View>
    <Text style={styles.emptyTitle}>No rides found</Text>
    <Text style={styles.emptySub}>
      Try a different date or nearby cities for more options.
    </Text>
  </View>
);

const AllridesComponent = ({ rides = [], loading, navigation, currentUserId }) => {
  const visibleRides = (rides || []).filter((item) => {
    if (!currentUserId) return true;
    return refId(item?.creator) !== refId(currentUserId);
  });

  const renderRide = useCallback(
    ({ item }) => (
      <SearchRideCard
        item={item}
        onPress={() => navigation.navigate("RideDetails", { ride: item })}
      />
    ),
    [navigation]
  );

  if (!loading && visibleRides.length === 0) {
    return <EmptyResults />;
  }

  return (
    <View style={styles.listRoot}>
      <AnimatedLoad
        loading={loading}
        skeleton={
          <View style={styles.skeletonWrap}>
            <RideListSkeleton count={4} />
          </View>
        }
        style={{ flex: 1 }}
      >
        <FlatList
          data={visibleRides}
          ListHeaderComponent={
            visibleRides.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.resultCount}>
                  {visibleRides.length} ride
                  {visibleRides.length !== 1 ? "s" : ""} available
                </Text>
                <AdPlacement placement="search_results" />
              </View>
            ) : null
          }
          keyExtractor={(item, index) =>
            item?._id ? item._id.toString() : index.toString()
          }
          renderItem={renderRide}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
        />
      </AnimatedLoad>
    </View>
  );
};

export default React.memo(AllridesComponent);

const styles = StyleSheet.create({
  listRoot: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.xl + 80,
  },
  listHeader: {
    marginBottom: LAYOUT.spacing.sm,
  },
  resultCount: {
    fontSize: LAYOUT.font.small,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: LAYOUT.spacing.sm,
    marginLeft: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  skeletonWrap: {
    padding: LAYOUT.spacing.md,
    flex: 1,
  },

  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    ...DS.shadow.card,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardAccent: {
    height: 4,
    width: "100%",
  },
  cardBody: {
    padding: LAYOUT.spacing.md,
  },

  routeBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeTimeline: {
    alignItems: "center",
    width: scale(20),
    paddingTop: scale(4),
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
    minHeight: scale(28),
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  routeTextCol: {
    flex: 1,
    marginLeft: LAYOUT.spacing.sm,
    marginRight: LAYOUT.spacing.sm,
  },
  routePoint: {
    marginBottom: scale(10),
  },
  routePointTo: {
    marginBottom: 0,
  },
  routeLabel: {
    fontSize: LAYOUT.font.tiny,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  routeCity: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    color: "#0F172A",
  },
  priceBlock: {
    alignItems: "flex-end",
    minWidth: scale(64),
  },
  priceLabel: {
    fontSize: LAYOUT.font.tiny,
    color: "#94A3B8",
    marginBottom: 2,
  },
  priceValue: {
    fontSize: LAYOUT.font.title,
    fontWeight: "800",
    color: DS.colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: LAYOUT.spacing.md,
  },

  driverRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverCol: {
    flex: 1,
    marginLeft: LAYOUT.spacing.md,
  },
  driverName: {
    fontSize: LAYOUT.font.body,
    fontWeight: "700",
    color: "#0F172A",
  },
  vehicleText: {
    fontSize: LAYOUT.font.small,
    color: "#64748B",
    marginTop: 3,
  },
  chevronWrap: {
    padding: 4,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: LAYOUT.spacing.md,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaChipText: {
    fontSize: LAYOUT.font.small,
    fontWeight: "600",
    color: "#475569",
  },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  ctaText: {
    fontSize: LAYOUT.font.small,
    fontWeight: "600",
    color: DS.colors.primary,
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
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: LAYOUT.spacing.md,
  },
  emptyTitle: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: LAYOUT.font.body,
    color: "#64748B",
    textAlign: "center",
    lineHeight: scale(22),
  },
});
