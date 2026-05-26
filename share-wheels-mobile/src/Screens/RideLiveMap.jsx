import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import BackButton from "../Components/BackButton";
import ScreenContainer from "../Components/ui/ScreenContainer";
import LeafletRideMap from "../Components/maps/LeafletRideMap";
import { getRideTracking } from "../ApiService/chatApiServices";
import { useParticipantLocation } from "../hooks/useDriverLocation";

const RideLiveMap = () => {
  const route = useRoute();
  const { rideId, rideTitle, myRole, rideStatus } = route.params || {};
  const [token, setToken] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  const isStarted =
    rideStatus === "started" || rideStatus === "Started" || tracking?.status === "started";

  useParticipantLocation({
    enabled: isStarted && !!token && !!rideId,
    rideId,
    token,
  });

  const loadTracking = useCallback(async () => {
    if (!token || !rideId) return;
    try {
      const res = await getRideTracking(token, rideId);
      setTracking(res);
    } catch (e) {
      console.warn("[map] tracking:", e.message);
    } finally {
      setLoading(false);
    }
  }, [token, rideId]);

  useEffect(() => {
    AsyncStorage.getItem("token").then(setToken);
  }, []);

  useEffect(() => {
    if (token) loadTracking();
  }, [token, loadTracking]);

  useEffect(() => {
    if (!token || !isStarted) return undefined;
    const poll = setInterval(loadTracking, 5000);
    return () => clearInterval(poll);
  }, [token, isStarted, loadTracking]);

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
      ) : null}

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

      <View style={styles.legend}>
        <Text style={styles.legendItem}>🚗 Driver</Text>
        <Text style={styles.legendItem}>👤 Passenger</Text>
        <Text style={styles.legendItem}>📦 Courier</Text>
      </View>
      <Text style={styles.note}>
        Your location is shared while the ride is in progress. Gold ring = you.
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
  map: { marginTop: 8 },
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
