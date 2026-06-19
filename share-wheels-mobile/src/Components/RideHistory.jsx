import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* COMPONENTS */
import BottomSlider from "../Components/BottomSlider";
import RideHistoryDriverview from "../Components/RideHistoryDriverview";
import RideHistoryPassengerview from "../Components/RideHistoryPassengerview";
import RideHistoryCourierview from "../Components/RideHistoryCourierview";
import BackButton from "../Components/BackButton";

/* API */
import { rideHistory, rideDetails } from "../ApiService/ridesApiServices";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { RideListSkeleton } from "./ui/Skeleton";
import AnimatedLoad from "./ui/AnimatedLoad";
import AnimatedTabs from "./ui/AnimatedTabs";
import FadePanel from "./ui/FadePanel";
import { useFocusEffect } from "@react-navigation/native";
import { getRideDisplayFare, getDriverTotalEarnings } from "../Utils/fareUtils";
import UserAvatar from "./ui/UserAvatar";
import ScreenContainer from "./ui/ScreenContainer";
import AdPlacement from "./ads/AdPlacement";
import { useAds } from "../context/AdsContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding } from "../theme/layout";
import { formatDisplayTime } from "../Utils/dateUtils";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import {
  getRoleCardThemes,
  getHistorySliderThemes,
} from "../theme/appTheme";

const FILTER_TABS = ["All", "Driver", "Passenger", "Courier"];

const roleColors = {
  Driver: ["#3B82F6", "#60A5FA"],
  Passenger: ["#16A34A", "#4ADE80"],
  Courier: ["#EA580C", "#FDBA74"],
};

const toDateLabel = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const toTimeLabel = (value) => formatDisplayTime(value) || "—";

const sortHistoryByRecent = (items = []) =>
  [...items].sort((a, b) => {
    const aTime = new Date(
      a?.completedAt || a?.updatedAt || a?.createdAt || a?.date || 0
    ).getTime();
    const bTime = new Date(
      b?.completedAt || b?.updatedAt || b?.createdAt || b?.date || 0
    ).getTime();
    return bTime - aTime;
  });

const RideHistory = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const roleCardTheme = getRoleCardThemes(colors);
  const sliderThemes = getHistorySliderThemes(colors);
  const { refreshAds } = useAds();
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [isSliderVisible, setSliderVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchRides = useCallback(async ({ isRefresh = false } = {}) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await rideHistory(token);

      if (res?.rides) {
        const completedOnly = (res.rides || []).filter(
          (r) => r.status === "completed"
        );
        const data = sortHistoryByRecent(
          completedOnly.map((ride) => ({
            ...ride,
            id: ride._id,
            role:
              ride.myRole === "driver"
                ? "Driver"
                : ride.myRole === "passenger"
                ? "Passenger"
                : "Courier",
            formattedDate: toDateLabel(ride.date),
            formattedTime: toTimeLabel(ride.startTime || ride.date),
            courierSnapshot:
              ride.courierSnapshot || ride.activeData || ride.all_deliveries?.[0] || null,
          }))
        );

        setRides(data);
        setFilteredRides(
          activeFilter === "All"
            ? data
            : data.filter((r) => r.role === activeFilter)
        );
        setErrorMsg("");
      } else {
        setRides([]);
        setFilteredRides([]);
        setErrorMsg("");
      }
    } catch (e) {
      console.log("Error:", e);
      setErrorMsg(getApiErrorMessage(e, "Failed to load ride history."));
      setRides([]);
      setFilteredRides([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    fetchRides({ isRefresh: true });
    refreshAds();
  }, [fetchRides, refreshAds]);

  useFocusEffect(
    useCallback(() => {
      fetchRides({ isRefresh: false });
      refreshAds();
    }, [fetchRides, refreshAds])
  );

  const activeFilterIndex = FILTER_TABS.indexOf(activeFilter);

  const applyFilter = (filter) => {
    setActiveFilter(filter);
    if (filter === "All") setFilteredRides(rides);
    else setFilteredRides(rides.filter((r) => r.role === filter));
  };

  const loadRideDetails = async (item) => {
    const rideId = item?.id || item?._id;
    if (!rideId) return item;
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return item;
      const res = await rideDetails(token, rideId);
      const detail = res?.data;
      if (!detail) return item;
      return {
        ...item,
        status: detail.status ?? item.status,
        passengers: detail.passengers ?? item.passengers,
        all_deliveries: detail.all_deliveries ?? item.all_deliveries,
        vehicle: detail.vehicle ?? item.vehicle,
        creator: detail.creator ?? item.creator,
        courierSnapshot: item.activeData ?? item.courierSnapshot,
      };
    } catch (e) {
      console.warn("[history] details:", e.message);
      return item;
    }
  };

  const handlePress = async (item) => {
    setSelectedRide(item);
    setSliderVisible(true);
    setDetailsLoading(true);
    const enriched = await loadRideDetails(item);
    setSelectedRide(enriched);
    setDetailsLoading(false);
  };

  const renderSliderContent = () => {
    if (!selectedRide) return null;

    if (selectedRide.role === "Driver")
      return (
        <RideHistoryDriverview ride={selectedRide} loading={detailsLoading} />
      );

    if (selectedRide.role === "Passenger")
      return (
        <RideHistoryPassengerview ride={selectedRide} loading={detailsLoading} />
      );

    return (
      <RideHistoryCourierview ride={selectedRide} loading={detailsLoading} />
    );
  };

  const renderItem = ({ item }) => {
    const colors = roleColors[item.role];
    const cardTheme = roleCardTheme[item.role] || roleCardTheme.Driver;

    return (
      <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.8}>
        <View style={styles.row}>
          <View style={styles.timeline}>
            <LinearGradient colors={colors} style={styles.gradientLine} />
            <LinearGradient colors={colors} style={styles.dotGradient} />
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={cardTheme.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cardInner, { borderColor: cardTheme.border }]}
            >
              <View style={styles.cardHeaderRow}>
                <UserAvatar user={item?.creator} size={LAYOUT.sizes.avatarSm} />
                <View style={styles.cardHeaderText}>
              <View style={styles.topRow}>
                <Text style={[styles.role, { backgroundColor: colors[0] }]}>
                  {item.role}
                </Text>
                <Text style={styles.price}>
                  ₹
                  {item.role === "Driver"
                    ? getDriverTotalEarnings(item)
                    : getRideDisplayFare(item)}
                </Text>
              </View>
                </View>
              </View>

              <Text style={styles.route}>
                {item.from} → {item.to}
              </Text>

              <View style={styles.bottomRow}>
                <Text style={styles.meta}>
                  {item.formattedDate} • {item.formattedTime}
                </Text>
                <Text style={[styles.status, { color: colors[0] }]}>
                  {item.status}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Ride History</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={refreshing || loading}
          accessibilityRole="button"
          accessibilityLabel="Refresh ride history"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="refresh" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <AnimatedLoad
        loading={loading}
        skeleton={
          <View style={styles.skeletonPad}>
            <RideListSkeleton count={4} variant="history" />
          </View>
        }
        style={{ flex: 1 }}
      >
      {errorMsg ? <Text style={styles.errorBanner}>{errorMsg}</Text> : null}

      <AnimatedTabs
        tabs={FILTER_TABS}
        activeIndex={activeFilterIndex}
        variant="chip"
        onChange={(index) => applyFilter(FILTER_TABS[index])}
      />

      <FadePanel activeKey={activeFilter}>
        <FlatList
          data={filteredRides}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListHeaderComponent={<AdPlacement placement="ride_history" />}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No Ride History Found</Text>
              <TouchableOpacity
                style={styles.emptyRefreshBtn}
                onPress={onRefresh}
                disabled={refreshing || loading}
                activeOpacity={0.85}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Icon name="refresh" size={16} color={colors.primary} />
                    <Text style={styles.emptyRefreshText}>Refresh</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{
            paddingBottom: getScrollBottomPadding(insets.bottom),
            flexGrow: 1,
          }}
        />
      </FadePanel>
      </AnimatedLoad>

      {/* SLIDER */}
      <BottomSlider
        visible={isSliderVisible}
        onClose={() => setSliderVisible(false)}
        scrollable
        theme={
          sliderThemes[selectedRide?.role] || sliderThemes.Driver
        }
      >
        {renderSliderContent()}
      </BottomSlider>
    </ScreenContainer>
  );
};

export default RideHistory;

const createStyles = (c) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingBottom: LAYOUT.spacing.sm,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  headerTitle: {
    flex: 1,
    fontSize: LAYOUT.font.title,
    fontWeight: "800",
    marginLeft: 10,
    color: c.text,
  },

  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primaryMuted,
    borderWidth: 1,
    borderColor: c.border,
  },

  skeletonPad: { padding: 16, flex: 1 },

  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },

  noDataText: {
    fontSize: 16,
    color: c.textMuted,
    fontWeight: "500",
    marginBottom: 12,
  },
  emptyRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.primaryMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyRefreshText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.primary,
  },
  errorBanner: {
    color: c.errorText,
    backgroundColor: c.errorBg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },

  filters: { flexDirection: "row", marginBottom: 16 },

  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: c.chipBg,
    marginRight: 10,
  },

  activeFilterBtn: { backgroundColor: c.primary },

  filterText: { color: c.textSecondary, fontWeight: "600" },

  activeFilterText: { color: c.inverseText },

  row: { flexDirection: "row", marginBottom: 20 },

  timeline: { alignItems: "center", width: 30 },

  gradientLine: { width: 4, flex: 1, borderRadius: 2, marginTop: 4 },

  dotGradient: { width: 14, height: 14, borderRadius: 10, marginTop: -7 },

  card: { flex: 1, paddingLeft: 12 },

  cardInner: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.2,
    elevation: 3,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  cardHeaderText: {
    flex: 1,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  role: {
    color: c.inverseText,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  price: { fontWeight: "800", fontSize: 14, color: c.text },

  route: { fontSize: 15, fontWeight: "700", marginBottom: 6, color: c.text },

  bottomRow: { flexDirection: "row", justifyContent: "space-between" },

  meta: { fontSize: 12, color: c.textMuted },

  status: { fontWeight: "700" },
});