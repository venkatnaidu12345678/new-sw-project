import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import Config from "react-native-config";
import {
  buildMarkersFromTracking,
  getMapFocusCoordinates,
  regionForCoordinates,
  DEFAULT_MAP_CENTER,
  ROLE_PIN_COLORS,
} from "./rideMapMarkers";
import RideMapMarkerIcon, { ROLE_MAP_ICONS } from "./RideMapMarkerIcon";
import Icon from "react-native-vector-icons/Ionicons";

const googleMapsKey = (Config.GOOGLE_MAPS_API_KEY || "").trim();

const MAP_EDGE_PADDING = { top: 56, right: 56, bottom: 80, left: 56 };

const useMapsModule = () => {
  const [maps, setMaps] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      try {
        const mod = require("react-native-maps");
        if (!cancelled) {
          setMaps({
            MapView: mod.default,
            Marker: mod.Marker,
            Polyline: mod.Polyline,
            PROVIDER_GOOGLE: mod.PROVIDER_GOOGLE,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || "Failed to load maps module");
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { maps, loadError };
};

/**
 * Live Google Map — always visible; GPS status as a slim banner (not a blocking overlay).
 */
const GoogleRideMap = ({
  tracking,
  myRole,
  style,
  height = 280,
  autoFocus = true,
  showMyLocation = false,
  gpsStatusText,
}) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const { maps, loadError } = useMapsModule();

  const { markers, path, hasRemoteMarkers } = useMemo(() => {
    const built = buildMarkersFromTracking(tracking, myRole);
    return {
      ...built,
      hasRemoteMarkers: built.markers.length > 0,
    };
  }, [tracking, myRole]);

  const focusCoordinates = useMemo(
    () => getMapFocusCoordinates(markers, path),
    [markers, path]
  );

  const focusKey = useMemo(
    () =>
      focusCoordinates
        .map((c) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`)
        .join("|"),
    [focusCoordinates]
  );

  const fitMapToContent = useCallback(() => {
    const map = mapRef.current;
    if (!map || focusCoordinates.length === 0) return;

    if (focusCoordinates.length === 1) {
      map.animateToRegion(regionForCoordinates(focusCoordinates), 400);
      return;
    }

    try {
      map.fitToCoordinates(focusCoordinates, {
        edgePadding: MAP_EDGE_PADDING,
        animated: true,
      });
    } catch {
      map.animateToRegion(regionForCoordinates(focusCoordinates), 400);
    }
  }, [focusCoordinates]);

  useEffect(() => {
    if (!autoFocus || !mapReady || !maps || !focusKey) return;
    const t = setTimeout(fitMapToContent, 120);
    return () => clearTimeout(t);
  }, [autoFocus, mapReady, maps, focusKey, fitMapToContent]);

  const statusMessage =
    gpsStatusText ||
    (!hasRemoteMarkers
      ? "Map ready · waiting for ride GPS signals…"
      : null);

  if (loadError) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <Text style={styles.missingKeyTitle}>Maps unavailable</Text>
        <Text style={styles.missingKeyText}>{loadError}</Text>
      </View>
    );
  }

  if (!maps) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <ActivityIndicator color="#2563EB" />
        <Text style={styles.placeholderText}>Loading map…</Text>
      </View>
    );
  }

  if (Platform.OS === "android" && !googleMapsKey) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <Text style={styles.missingKeyTitle}>Google Maps API key required</Text>
        <Text style={styles.missingKeyText}>
          Add GOOGLE_MAPS_API_KEY to .env, then rebuild the app.
        </Text>
      </View>
    );
  }

  const { MapView, Marker, Polyline, PROVIDER_GOOGLE } = maps;
  const initialRegion =
    focusCoordinates.length > 0
      ? regionForCoordinates(focusCoordinates)
      : DEFAULT_MAP_CENTER;

  return (
    <View style={[styles.wrap, { height }, style]}>
      {statusMessage ? (
        <View style={styles.statusBanner} pointerEvents="none">
          {!hasRemoteMarkers ? (
            <ActivityIndicator size="small" color="#2563EB" style={styles.statusSpinner} />
          ) : (
            <View style={styles.livePulse} />
          )}
          <Text style={styles.statusText} numberOfLines={2}>
            {statusMessage}
          </Text>
        </View>
      ) : null}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={showMyLocation}
        showsMyLocationButton={showMyLocation}
        loadingEnabled={false}
        moveOnMarkerPress={false}
      >
        {path.length > 1 ? (
          <Polyline coordinates={path} strokeColor="#2563EB" strokeWidth={4} />
        ) : null}

        {markers.map((m) => (
          <Marker
            key={`${m.id}-${m.role}-${m.latitude.toFixed(5)}-${m.longitude.toFixed(5)}`}
            coordinate={{
              latitude: m.latitude,
              longitude: m.longitude,
            }}
            title={m.title}
            description={m.description}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            zIndex={m.isMe ? 10 : m.role === "driver" ? 5 : 3}
          >
            <RideMapMarkerIcon role={m.role} isMe={m.isMe} />
          </Marker>
        ))}
      </MapView>

      <View style={styles.legendBar} pointerEvents="none">
        {Object.entries(ROLE_PIN_COLORS).map(([role, color]) => (
          <View key={role} style={styles.legendItem}>
            <View style={[styles.legendIconWrap, { backgroundColor: color }]}>
              <Icon
                name={ROLE_MAP_ICONS[role] || "location"}
                size={12}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.legendLabel}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default GoogleRideMap;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  map: { flex: 1 },
  placeholder: {
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748B",
  },
  missingKeyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  missingKeyText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  statusBanner: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statusSpinner: { marginRight: 8 },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  legendBar: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  legendLabel: { fontSize: 11, color: "#334155", fontWeight: "600" },
});
