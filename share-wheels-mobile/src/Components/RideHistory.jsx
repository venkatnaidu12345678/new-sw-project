import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
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

const FILTER_TABS = ["All", "Driver", "Passenger", "Courier"];

const roleColors = {
  Driver: ["#3B82F6", "#60A5FA"],
  Passenger: ["#16A34A", "#4ADE80"],
  Courier: ["#EA580C", "#FDBA74"],
};
const roleCardTheme = {
  Driver: { card: ["#EFF6FF", "#F8FAFC", "#FFFFFF"], border: "#93C5FD" },
  Passenger: { card: ["#ECFDF5", "#F8FAFC", "#FFFFFF"], border: "#86EFAC" },
  Courier: { card: ["#FFF7ED", "#FFFBEB", "#FFFFFF"], border: "#FDBA74" },
};

const toDateLabel = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const toTimeLabel = (value) => formatDisplayTime(value) || "—";

const RideHistory = () => {
  const insets = useSafeAreaInsets();
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

  // 🔄 AUTO REFRESH ON SCREEN FOCUS
  useFocusEffect(
    useCallback(() => {
      fetchRides();
      refreshAds();
    }, [refreshAds])
  );

  const fetchRides = async () => {
    try {
      if (!refreshing) setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await rideHistory(token);

      if (res?.rides) {
        const completedOnly = (res.rides || []).filter(
          (r) => r.status === "completed"
        );
        const data = completedOnly.map((ride) => ({
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
        }));

        setRides(data);
        setFilteredRides(data);
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
  };

  // 🔄 PULL TO REFRESH
  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

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
        {filteredRides.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No Ride History Found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRides}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            ListHeaderComponent={<AdPlacement placement="ride_history" />}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{
              paddingBottom: getScrollBottomPadding(insets.bottom),
            }}
          />
        )}
      </FadePanel>
      </AnimatedLoad>

      {/* SLIDER */}
      <BottomSlider
        visible={isSliderVisible}
        onClose={() => setSliderVisible(false)}
        scrollable={false}
        theme={{
          gradient: ["#EFF6FF", "#F8FAFC", "#FFFFFF"],
          borderColor: "#93C5FD",
          handleColor: "#60A5FA",
          closeColor: "#1E3A8A",
          backdropOpacity: 0.45,
        }}
      >
        {renderSliderContent()}
      </BottomSlider>
    </ScreenContainer>
  );
};

export default RideHistory;

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingBottom: LAYOUT.spacing.sm,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: LAYOUT.font.title,
    fontWeight: "800",
    marginLeft: 10,
    color: "#111827",
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
    color: "#6B7280",
    fontWeight: "500",
  },
  errorBanner: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
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
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },

  activeFilterBtn: { backgroundColor: "#0F172A" },

  filterText: { color: "#334155", fontWeight: "600" },

  activeFilterText: { color: "#fff" },

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
    shadowColor: "#0F172A",
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
    color: "#fff",
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  price: { fontWeight: "800", fontSize: 14, color: "#0F172A" },

  route: { fontSize: 15, fontWeight: "700", marginBottom: 6, color: "#0F172A" },

  bottomRow: { flexDirection: "row", justifyContent: "space-between" },

  meta: { fontSize: 12, color: "#64748B" },

  status: { fontWeight: "700" },
});