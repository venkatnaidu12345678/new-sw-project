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
import { rideHistory } from "../ApiService/ridesApiServices";
import { RideListSkeleton } from "./ui/Skeleton";
import AnimatedLoad from "./ui/AnimatedLoad";
import AnimatedTabs from "./ui/AnimatedTabs";
import FadePanel from "./ui/FadePanel";
import { useFocusEffect } from "@react-navigation/native";
import { getRideDisplayFare } from "../Utils/fareUtils";

const FILTER_TABS = ["All", "Driver", "Passenger", "Courier"];

const roleColors = {
  Driver: ["#3B82F6", "#60A5FA"],
  Passenger: ["#16A34A", "#4ADE80"],
  Courier: ["#EA580C", "#FDBA74"],
};

const RideHistory = () => {
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [isSliderVisible, setSliderVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  // 🔄 AUTO REFRESH ON SCREEN FOCUS
  useFocusEffect(
    useCallback(() => {
      fetchRides();
    }, [])
  );

  const fetchRides = async () => {
    try {
      if (!refreshing) setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await rideHistory(token);

      if (res?.rides) {
        const data = res.rides.map((ride) => ({
          ...ride,
          id: ride._id,
          role:
            ride.myRole === "driver"
              ? "Driver"
              : ride.myRole === "passenger"
              ? "Passenger"
              : "Courier",

          formattedDate: new Date(ride.date).toLocaleDateString(),

          formattedTime: new Date(ride.startTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setRides(data);
        setFilteredRides(data);
      } else {
        setRides([]);
        setFilteredRides([]);
      }
    } catch (e) {
      console.log("Error:", e);
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

  const handlePress = (item) => {
    setSelectedRide(item);
    setSliderVisible(true);
  };

  const renderSliderContent = () => {
    if (!selectedRide) return null;

    if (selectedRide.role === "Driver")
      return <RideHistoryDriverview ride={selectedRide} />;

    if (selectedRide.role === "Passenger")
      return <RideHistoryPassengerview ride={selectedRide} />;

    return <RideHistoryCourierview ride={selectedRide} />;
  };

  const renderItem = ({ item }) => {
    const colors = roleColors[item.role];

    return (
      <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.8}>
        <View style={styles.row}>
          <View style={styles.timeline}>
            <LinearGradient colors={colors} style={styles.gradientLine} />
            <LinearGradient colors={colors} style={styles.dotGradient} />
          </View>

          <View style={styles.card}>
            <LinearGradient colors={["#fff", "#f9fafb"]} style={styles.cardInner}>
              <View style={styles.topRow}>
                <Text style={[styles.role, { backgroundColor: colors[0] }]}>
                  {item.role}
                </Text>
                <Text style={styles.price}>₹{getRideDisplayFare(item)}</Text>
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
    <View style={styles.container}>
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
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </FadePanel>
      </AnimatedLoad>

      {/* SLIDER */}
      <BottomSlider
        visible={isSliderVisible}
        onClose={() => setSliderVisible(false)}
      >
        {renderSliderContent()}
      </BottomSlider>
    </View>
  );
};

export default RideHistory;

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 22,
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
    backgroundColor: "#fff",
    elevation: 3,
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

  price: { fontWeight: "800", fontSize: 14 },

  route: { fontSize: 15, fontWeight: "600", marginBottom: 6 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between" },

  meta: { fontSize: 12, color: "#64748B" },

  status: { fontWeight: "600" },
});