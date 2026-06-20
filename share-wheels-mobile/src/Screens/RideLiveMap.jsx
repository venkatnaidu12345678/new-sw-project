import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import BackButton from "../Components/BackButton";
import ScreenContainer from "../Components/ui/ScreenContainer";
import GoogleRideMap from "../Components/maps/GoogleRideMap";
import { hasParticipantCoords } from "../Components/maps/rideMapMarkers";
import { MAP_PIN_THEME } from "../Components/maps/mapTheme";
import Icon from "react-native-vector-icons/Ionicons";
import { useLiveRideMap } from "../hooks/useLiveRideMap";
import { usePlannedRoute } from "../hooks/usePlannedRoute";
import { useParticipantRoute } from "../hooks/useParticipantRoute";
import { useRideEndpointMarkers } from "../hooks/useRideEndpointMarkers";
import { setActiveRideTracking } from "../Utils/activeRideTracking";
import { normalizeRideId } from "../liveTracking/liveTrackingState";
import {
  buildDriverParticipantRoutes,
  findParticipantRouteByKey,
} from "../Utils/participantRouteUtils";
import { normalizeNavigationParamId } from "../Utils/participantIds";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const EMPTY_TRACKING = Object.freeze({
  liveTracking: Object.freeze({ participantLocations: [] }),
});

const RideLiveMap = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const route = useRoute();
  const {
    rideId,
    rideTitle,
    myRole,
    rideStatus,
    routePolyline: routePolylineParam = "",
    focusParticipantId: focusParticipantIdParam = null,
  } = route.params || {};

  const focusParticipantId = useMemo(
    () => normalizeNavigationParamId(focusParticipantIdParam),
    [focusParticipantIdParam]
  );

  const [token, setToken] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [myName, setMyName] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(focusParticipantId);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [routeFitNonce, setRouteFitNonce] = useState(0);

  const isStarted = rideStatus === "started" || rideStatus === "Started";

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
    setSelectedParticipantId(focusParticipantId);
  }, [focusParticipantId]);

  useEffect(() => {
    if (isStarted && rideId) setActiveRideTracking(rideId);
  }, [isStarted, rideId]);

  useEffect(() => {
    if (!mapFullscreen) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setMapFullscreen(false);
      return true;
    });
    return () => sub.remove();
  }, [mapFullscreen]);

  const { tracking, permission, loading: trackingLoading, statusHint } = useLiveRideMap({
    rideId,
    token,
    enabled: isStarted && !!token && !!rideId,
    myRole,
    myUserId,
    myName,
  });

  const rideMeta = useMemo(
    () => ({
      from: tracking?.from || "",
      to: tracking?.to || "",
      date: tracking?.date || null,
      passengers: tracking?.passengers || [],
      couriers: tracking?.couriers || [],
    }),
    [tracking]
  );

  const savedRoutePolyline =
    String(tracking?.routePolyline || routePolylineParam || "").trim();

  const { route: plannedRoute, loading: routeLoading } = usePlannedRoute(
    tracking?.fromCoords,
    tracking?.toCoords,
    isStarted && (!!tracking || !!savedRoutePolyline),
    {
      from: tracking?.from,
      to: tracking?.to,
      stopovers: tracking?.stopovers || [],
    },
    savedRoutePolyline
  );

  const effectiveRole = myRole || tracking?.role;
  const isDriver = effectiveRole === "driver";
  const isPassengerOrCourier =
    effectiveRole === "passenger" || effectiveRole === "courier";

  const participantRoutes = useMemo(
    () =>
      buildDriverParticipantRoutes({
        passengers: rideMeta.passengers,
        couriers: rideMeta.couriers,
        rideFrom: rideMeta.from || tracking?.from,
        rideTo: rideMeta.to || tracking?.to,
      }),
    [rideMeta, tracking?.from, tracking?.to]
  );

  const selectedParticipant = useMemo(
    () => findParticipantRouteByKey(participantRoutes, selectedParticipantId),
    [participantRoutes, selectedParticipantId]
  );

  const isDefaultRideView = isDriver && isStarted && !selectedParticipantId;

  const selectDefaultRideView = () => {
    setSelectedParticipantId(null);
    setRouteFitNonce((n) => n + 1);
  };

  const driverLocation = tracking?.liveTracking?.driverLocation;

  const {
    driverLegPath,
    navigateTarget,
    loadingDriverLeg,
  } = useParticipantRoute(
    selectedParticipant,
    driverLocation,
    tracking?.liveTracking,
    isDriver && isStarted && !!selectedParticipant
  );

  const navigationTargetMarker = useMemo(() => {
    if (!selectedParticipant || !navigateTarget) return null;
    const end =
      driverLegPath.length > 0
        ? driverLegPath[driverLegPath.length - 1]
        : null;
    const lat = end?.latitude ?? navigateTarget.lat;
    const lng = end?.longitude ?? navigateTarget.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      id: `nav-target-${selectedParticipant.id}`,
      latitude: lat,
      longitude: lng,
      role:
        navigateTarget.kind === "drop" ? "participant-drop" : "participant-pickup",
      title: navigateTarget.label,
      description: `Go to ${selectedParticipant.name}`,
    };
  }, [selectedParticipant, navigateTarget, driverLegPath]);

  const { markers: rideEndpointMarkers } = useRideEndpointMarkers({
    enabled: isDriver && isStarted,
    participantRoutes,
    enrouteItems: [],
    originCoords: tracking?.fromCoords,
  });

  const waitingParticipants = useMemo(() => {
    if (!isDriver) return [];
    const list = tracking?.liveTracking?.participantLocations || [];
    return list.filter(
      (p) =>
        (p.role === "passenger" || p.role === "courier") &&
        !hasParticipantCoords(p)
    );
  }, [tracking, isDriver]);

  const mapGpsHint = useMemo(() => {
    if (!isStarted) return null;
    if (!permission) {
      return "Location off — enable in Settings";
    }
    if (isPassengerOrCourier && !driverLocation) {
      return "Waiting for driver…";
    }
    if (selectedParticipant && loadingDriverLeg) {
      return null;
    }
    if (isDriver && routeLoading) {
      return null;
    }
    return null;
  }, [
    isStarted,
    permission,
    isPassengerOrCourier,
    driverLocation,
    selectedParticipant,
    loadingDriverLeg,
    isDriver,
    routeLoading,
  ]);

  const mapLoading = isStarted && (!token || trackingLoading);

  return (
    <ScreenContainer
      style={[styles.container, mapFullscreen && styles.containerFullscreen]}
      edges={mapFullscreen ? ["top"] : ["top", "bottom"]}
    >
      {!mapFullscreen ? (
        <View style={styles.header}>
          <BackButton />
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {rideTitle || "Live map"}
            </Text>
            {isStarted ? (
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {!mapFullscreen && !isStarted ? (
        <Text style={styles.hint}>Available when the ride starts</Text>
      ) : null}

      <View style={[styles.mapArea, mapFullscreen && styles.mapAreaFullscreen]}>
        <GoogleRideMap
          tracking={tracking || EMPTY_TRACKING}
          myRole={effectiveRole}
          fill
          loading={mapLoading}
          loadingText="Loading map…"
          showMyLocation={isStarted && permission}
          gpsStatusText={mapGpsHint || statusHint}
          fullscreenTitle={rideTitle || "Live map"}
          isFullscreen={mapFullscreen}
          onFullscreenChange={setMapFullscreen}
          plannedRoute={plannedRoute}
          fromCoords={tracking?.fromCoords}
          toCoords={tracking?.toCoords}
          stopovers={tracking?.stopovers || []}
          participantJourneyPath={[]}
          driverToParticipantPath={
            isDriver && selectedParticipant ? driverLegPath : []
          }
          participantEndpointMarkers={
            isDriver && isStarted && !selectedParticipantId ? rideEndpointMarkers : []
          }
          navigationTargetMarker={
            isDriver && selectedParticipant ? navigationTargetMarker : null
          }
          participantNavActive={isDriver && isStarted && !!selectedParticipant}
          driverControls={isDriver && isStarted}
          driverPickOnly={isDriver && isStarted && !!selectedParticipant}
          defaultRideView={isDefaultRideView}
          routeFitNonce={routeFitNonce}
        />
      </View>

      {!mapFullscreen ? (
      <View style={styles.footer}>
        {isDriver && isStarted ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.participantChips}
          >
            <TouchableOpacity
              style={[
                styles.participantChip,
                isDefaultRideView && styles.participantChipActive,
                isDefaultRideView && { borderColor: colors.primary },
              ]}
              onPress={selectDefaultRideView}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.participantChipIconWrap,
                  {
                    backgroundColor: isDefaultRideView ? colors.primary : colors.surfaceAlt,
                  },
                ]}
              >
                <Icon
                  name="map"
                  size={14}
                  color={isDefaultRideView ? "#FFFFFF" : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.participantChipText,
                  isDefaultRideView && { color: colors.primary },
                ]}
                numberOfLines={1}
              >
                Default
              </Text>
              {isDefaultRideView && routeLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.chipSpinner}
                />
              ) : null}
            </TouchableOpacity>
            {participantRoutes.map((row) => {
              const active = String(selectedParticipantId) === String(row.id);
              const theme = MAP_PIN_THEME[row.role] || MAP_PIN_THEME.passenger;
              return (
                <TouchableOpacity
                  key={String(row.id)}
                  style={[
                    styles.participantChip,
                    active && styles.participantChipActive,
                    active && { borderColor: theme.color },
                  ]}
                  onPress={() => setSelectedParticipantId(String(row.id))}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.participantChipIconWrap,
                      { backgroundColor: active ? theme.color : colors.surfaceAlt },
                    ]}
                  >
                    <Icon
                      name={theme.icon}
                      size={14}
                      color={active ? "#FFFFFF" : colors.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.participantChipText,
                      active && { color: theme.color },
                    ]}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  {active && loadingDriverLeg ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.color}
                      style={styles.chipSpinner}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {isDriver && isStarted && waitingParticipants.length > 0 ? (
          <Text style={styles.footerAlert}>
            {waitingParticipants.length} waiting for GPS
          </Text>
        ) : null}
      </View>
      ) : null}
    </ScreenContainer>
  );
};

export default RideLiveMap;

const createStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 12 },
    containerFullscreen: {
      paddingHorizontal: 0,
    },
    mapArea: {
      flex: 1,
      minHeight: 320,
    },
    mapAreaFullscreen: {
      flex: 1,
      minHeight: undefined,
    },
    footer: {
      paddingTop: 10,
      paddingBottom: 8,
      gap: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 6,
      paddingBottom: 8,
    },
    headerText: { marginLeft: 8, flex: 1 },
    title: { fontSize: 17, fontWeight: "700", color: c.text },
    liveRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.successText,
      marginRight: 5,
    },
    liveText: { fontSize: 11, fontWeight: "700", color: c.successText },
    hint: {
      color: c.warningText,
      marginBottom: 8,
      fontSize: 12,
      textAlign: "center",
    },
    participantChips: {
      gap: 8,
      paddingRight: 4,
    },
    participantChip: {
      flexDirection: "row",
      alignItems: "center",
      maxWidth: 168,
      paddingRight: 12,
      paddingLeft: 6,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    participantChipActive: {
      backgroundColor: c.surfaceAlt,
    },
    participantChipIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    participantChipText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      flexShrink: 1,
    },
    chipSpinner: {
      marginLeft: 6,
    },
    footerAlert: {
      fontSize: 11,
      color: c.warningText,
      textAlign: "center",
      fontWeight: "600",
    },
  });
