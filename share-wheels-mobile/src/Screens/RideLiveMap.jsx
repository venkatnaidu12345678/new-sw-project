import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import BackButton from "../Components/BackButton";
import ScreenContainer from "../Components/ui/ScreenContainer";
import LeafletRideMap from "../Components/maps/LeafletRideMap";
import { useParticipantLocation } from "../hooks/useDriverLocation";
import { useRideTracking } from "../hooks/useRideTracking";

const RideLiveMap = () => {
  const route = useRoute();
  const { rideId, rideTitle, myRole, rideStatus } = route.params || {};
  const [token, setToken] = useState(null);

  const isStarted =
    rideStatus === "started" || rideStatus === "Started";

  useParticipantLocation({
    enabled: isStarted && !!token && !!rideId,
    rideId,
    token,
  });

  const { tracking, loading } = useRideTracking({
    rideId,
    token,
    enabled: isStarted && !!token && !!rideId,
  });

  useEffect(() => {
    AsyncStorage.getItem("token").then(setToken);
  }, []);

  const participantCount =
    tracking?.liveTracking?.participantLocations?.filter(
      (p) => p.role !== "driver"
    ).length || 0;
  const hasDriver = !!tracking?.liveTracking?.driverLocation;

  return (
    <ScreenContainer backgroundColor="#F8FAFC" style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.title}>Live map</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {rideTitle || "Ride tracking"}
          </Text>
        </View>
      </View>

      {!isStarted ? (
        <Text style={styles.hint}>Map is available after the ride has started.</Text>
      ) : (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live via socket</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563EB" />
      ) : (
        <LeafletRideMap
          tracking={tracking}
          myRole={myRole || tracking?.role}
          style={styles.map}
          height={360}
        />
      )}

      {isStarted && !loading && (
        <Text style={styles.statusLine}>
          {hasDriver ? "Driver on map" : "Waiting for driver GPS…"}
          {participantCount > 0
            ? ` · ${participantCount} passenger/courier on map`
            : ""}
        </Text>
      )}

      <View style={styles.legend}>
        <Text style={styles.legendItem}>🚗 Driver</Text>
        <Text style={styles.legendItem}>👤 Passenger</Text>
        <Text style={styles.legendItem}>📦 Courier</Text>
      </View>
      <Text style={styles.note}>
        {myRole === "driver"
          ? "You share your location; passengers and couriers appear as they share GPS."
          : myRole === "courier"
            ? "You share your location and can see the driver (and other riders) in real time."
            : "You share your location and can see the driver (and other riders) in real time."}
      </Text>
    </ScreenContainer>
  );
};

export default RideLiveMap;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 12,
  },
  headerText: { marginLeft: 8, flex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B" },
  hint: { color: "#D97706", marginBottom: 12, fontSize: 13 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },
  liveText: { fontSize: 12, fontWeight: "700", color: "#166534" },
  map: { marginTop: 8 },
  statusLine: {
    fontSize: 12,
    color: "#475569",
    marginTop: 10,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  legendItem: { fontSize: 13, color: "#334155", fontWeight: "600" },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
});
