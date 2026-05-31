import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import BackButton from "../Components/BackButton";
import ScreenContainer from "../Components/ui/ScreenContainer";
import GoogleRideMap from "../Components/maps/GoogleRideMap";
import {
  hasParticipantCoords,
  ROLE_PIN_COLORS,
} from "../Components/maps/rideMapMarkers";
import { ROLE_MAP_ICONS } from "../Components/maps/RideMapMarkerIcon";
import Icon from "react-native-vector-icons/Ionicons";
import { useLiveRideMap } from "../hooks/useLiveRideMap";
import { setActiveRideTracking } from "../Utils/activeRideTracking";
import { normalizeRideId } from "../liveTracking/liveTrackingState";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const RideLiveMap = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const route = useRoute();
  const { rideId, rideTitle, myRole, rideStatus } = route.params || {};

  const [token, setToken] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [myName, setMyName] = useState(null);

  const isStarted =
    rideStatus === "started" || rideStatus === "Started";

  useEffect(() => {
    AsyncStorage.getItem("token").then(setToken);
    AsyncStorage.getItem("user").then((raw) => {
      if (!raw) return;
      try {
        const u = JSON.parse(raw);
        setMyUserId(normalizeRideId(u?._id || u?.id));
        setMyName(u?.name || null);
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    if (isStarted && rideId) setActiveRideTracking(rideId);
  }, [isStarted, rideId]);

  const { tracking, permission, statusHint, counts } = useLiveRideMap({
    rideId,
    token,
    enabled: isStarted && !!token && !!rideId,
    myRole,
    myUserId,
    myName,
  });

  const effectiveRole = myRole || tracking?.role;
  const isDriver = effectiveRole === "driver";

  const waitingParticipants = useMemo(() => {
    const list = tracking?.liveTracking?.participantLocations || [];
    return list.filter(
      (p) =>
        p.role !== "driver" &&
        (p.role === "passenger" || p.role === "courier") &&
        !hasParticipantCoords(p)
    );
  }, [tracking]);

  const mapGpsHint = useMemo(() => {
    if (!isStarted) return null;
    if (!permission) {
      return "Location was not enabled at sign-in. Open Settings to share your position on the map.";
    }
    return statusHint;
  }, [isStarted, permission, statusHint]);

  return (
    <ScreenContainer style={styles.container} edges={["top"]}>
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
          <Text style={styles.liveText}>Live · socket updates</Text>
        </View>
      )}

      <View style={styles.mapArea}>
        <GoogleRideMap
          tracking={
            tracking || { liveTracking: { participantLocations: [] } }
          }
          myRole={effectiveRole}
          fill
          autoFocus
          showMyLocation={isStarted && permission}
          gpsStatusText={mapGpsHint}
          fullscreenTitle={rideTitle || "Live map"}
        />
      </View>

      <ScrollView
        style={styles.footerScroll}
        contentContainerStyle={styles.footerContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.expandHint}>
          Tap the expand icon on the map for fullscreen view.
        </Text>

        {isStarted && statusHint ? (
          <Text style={styles.statusLine}>{statusHint}</Text>
        ) : null}

        {isDriver && isStarted && waitingParticipants.length > 0 ? (
          <Text style={styles.driverHint}>
            {waitingParticipants.length} participant
            {waitingParticipants.length > 1 ? "s" : ""} not on the map yet (location
            not enabled at sign-in).
          </Text>
        ) : null}

        <View style={styles.legend}>
          {["driver", "passenger", "courier"].map((role) => (
            <View key={role} style={styles.legendRow}>
              <View
                style={[
                  styles.legendIcon,
                  { backgroundColor: ROLE_PIN_COLORS[role] },
                ]}
              >
                <Icon name={ROLE_MAP_ICONS[role]} size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.legendText}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
                {role === "passenger" && counts.passengers > 0
                  ? ` (${counts.passengers})`
                  : ""}
                {role === "courier" && counts.couriers > 0
                  ? ` (${counts.couriers})`
                  : ""}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          {isDriver
            ? "Map auto-zooms to everyone sharing GPS. Updates arrive instantly over the network."
            : "Your position appears on the map as soon as GPS is available."}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
};

export default RideLiveMap;

const createStyles = (c) =>
  StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  mapArea: {
    flex: 1,
    minHeight: 280,
    marginTop: 4,
  },
  footerScroll: {
    flexGrow: 0,
    maxHeight: 200,
  },
  footerContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  expandHint: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: "center",
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerText: { marginLeft: 8, flex: 1 },
  title: { fontSize: 18, fontWeight: "700", color: c.text },
  subtitle: { fontSize: 13, color: c.textMuted },
  hint: { color: c.warningText, marginBottom: 12, fontSize: 13 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: c.successBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.successText,
    marginRight: 6,
  },
  liveText: { fontSize: 12, fontWeight: "700", color: c.successText },
  statusLine: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 10,
    textAlign: "center",
    fontWeight: "600",
  },
  driverHint: {
    fontSize: 11,
    color: c.warningText,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderRadius: 10,
  },
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  legendText: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: c.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
