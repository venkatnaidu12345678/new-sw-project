import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useEnrouteRequests } from "../../hooks/useEnrouteRequests";
import {
  getAlternativeRoutes,
  getDirectionsPolyline,
  getStopoverCandidates,
} from "../../ApiService/placesApiService";
import { decodePolyline } from "../../Utils/polyline";
import { regionForCoordinates } from "./rideMapMarkers";
import RouteMapPin from "./RouteMapPin";
import { MAP_LINE_THEME, ROUTE_LINE_BLUE } from "./mapTheme";
import { useTheme } from "../../context/ThemeContext";
import { DS } from "../../theme/designSystem";

const SELECTED_ROUTE_COLOR = ROUTE_LINE_BLUE;
const INACTIVE_ROUTE_COLOR = MAP_LINE_THEME.routeInactive;

const formatDistance = (meters) => {
  const m = Number(meters);
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds) => {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

export default function RouteStopoversPicker({
  fromCoords,
  toCoords,
  fromLabel = "",
  toLabel = "",
  rideDate = null,
  onChange,
  theme,
  isFullscreen: isFullscreenControlled,
  onFullscreenChange,
  fullscreenTitle = "Route map",
  allowFullscreen = true,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(theme, colors), [theme, colors]);
  const mapRef = useRef(null);
  const initialRegionRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [maps, setMaps] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [routePolyline, setRoutePolyline] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedStopIds, setSelectedStopIds] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopoverSearch, setStopoverSearch] = useState("");
  const [error, setError] = useState("");
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = isFullscreenControlled ?? internalFullscreen;

  const setFullscreen = useCallback(
    (next) => {
      if (isFullscreenControlled === undefined) {
        setInternalFullscreen(next);
      }
      onFullscreenChange?.(next);
    },
    [isFullscreenControlled, onFullscreenChange]
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      } catch {
        if (!cancelled) setError("Maps module unavailable");
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const endpointsReady =
    (fromCoords?.lat != null && fromCoords?.lng != null) ||
    String(fromLabel || "").trim().length >= 2;
  const destinationsReady =
    (toCoords?.lat != null && toCoords?.lng != null) ||
    String(toLabel || "").trim().length >= 2;

  const emitChange = useCallback(
    (payload) => {
      onChangeRef.current?.(payload);
    },
    []
  );

  useEffect(() => {
    if (!endpointsReady || !destinationsReady) {
      setRoutes([]);
      setRoutePolyline("");
      setCandidates([]);
      setSelectedStopIds([]);
      emitChange(null);
      return undefined;
    }

    let cancelled = false;
    setLoadingRoutes(true);
    setError("");

    (async () => {
      try {
        const list = await getAlternativeRoutes(fromCoords, toCoords, {
          from: fromLabel,
          to: toLabel,
        });
        if (cancelled) return;
        setRoutes(list);
        const first = list[0];
        setSelectedIndex(0);
        setRoutePolyline(first?.polyline || "");
        setSelectedStopIds([]);
        setStopoverSearch("");
        emitChange(
          first
            ? {
                selectedRouteIndex: 0,
                routePolyline: first.polyline,
                stopovers: [],
                distanceMeters: first.distanceMeters,
                durationSeconds: first.durationSeconds,
              }
            : null
        );
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load routes");
          setRoutes([]);
        }
      } finally {
        if (!cancelled) setLoadingRoutes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    endpointsReady,
    destinationsReady,
    fromCoords?.lat,
    fromCoords?.lng,
    toCoords?.lat,
    toCoords?.lng,
    fromLabel,
    toLabel,
    emitChange,
  ]);

  useEffect(() => {
    if (!routePolyline) {
      setCandidates([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingStops(true);

    getStopoverCandidates(routePolyline, 20)
      .then((list) => {
        if (!cancelled) setCandidates(list);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStops(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routePolyline]);

  const decodedRoutes = useMemo(
    () =>
      routes.map((route) => ({
        ...route,
        path: route.polyline ? decodePolyline(route.polyline) : [],
      })),
    [routes]
  );

  const basePath = useMemo(() => {
    const row = decodedRoutes.find((r) => r.index === selectedIndex);
    return row?.path?.length > 1 ? row.path : [];
  }, [decodedRoutes, selectedIndex]);

  const activePath = useMemo(() => {
    const adjusted = routePolyline ? decodePolyline(routePolyline) : [];
    return adjusted.length > 1 ? adjusted : basePath;
  }, [routePolyline, basePath]);

  const endpointFocusCoords = useMemo(() => {
    const pts = [];
    if (fromCoords?.lat != null && fromCoords?.lng != null) {
      pts.push({ latitude: fromCoords.lat, longitude: fromCoords.lng });
    }
    if (toCoords?.lat != null && toCoords?.lng != null) {
      pts.push({ latitude: toCoords.lat, longitude: toCoords.lng });
    }
    return pts;
  }, [fromCoords, toCoords]);

  const mapFitCoords = useMemo(() => {
    if (activePath.length > 1) {
      return activePath.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
    }
    return endpointFocusCoords;
  }, [activePath, endpointFocusCoords]);

  if (!initialRegionRef.current && endpointFocusCoords.length > 0) {
    initialRegionRef.current = regionForCoordinates(endpointFocusCoords);
  } else if (!initialRegionRef.current && mapFitCoords.length > 0) {
    initialRegionRef.current = regionForCoordinates([
      mapFitCoords[0],
      mapFitCoords[mapFitCoords.length - 1],
    ]);
  }

  const mapRegion = initialRegionRef.current || regionForCoordinates([]);

  useEffect(() => {
    initialRegionRef.current = null;
    setMapReady(false);
  }, [fromCoords?.lat, fromCoords?.lng, toCoords?.lat, toCoords?.lng]);

  const selectedStopovers = useMemo(
    () =>
      candidates
        .filter((c) => selectedStopIds.includes(c.id))
        .map((c) => ({ label: c.label, lat: c.lat, lng: c.lng })),
    [candidates, selectedStopIds]
  );

  const enrouteCorridorStops = useMemo(() => {
    if (selectedStopovers.length) return selectedStopovers;
    return candidates.map((c) => ({ label: c.label, lat: c.lat, lng: c.lng }));
  }, [selectedStopovers, candidates]);

  const filteredCandidates = useMemo(() => {
    const q = stopoverSearch.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => String(c.label || "").toLowerCase().includes(q));
  }, [candidates, stopoverSearch]);

  const enroutePreview = useEnrouteRequests({
    from: fromLabel,
    to: toLabel,
    date: rideDate,
    stopovers: enrouteCorridorStops,
    routePolyline,
    enabled:
      !!rideDate &&
      !!String(fromLabel || "").trim() &&
      !!String(toLabel || "").trim() &&
      !!routePolyline,
  });

  const applyStopoverIds = async (nextIds) => {
    setSelectedStopIds(nextIds);
    const stops = candidates
      .filter((c) => nextIds.includes(c.id))
      .map((c) => ({ label: c.label, lat: c.lat, lng: c.lng }));

    const row = routes.find((r) => r.index === selectedIndex);
    if (!stops.length) {
      setRoutePolyline(row?.polyline || "");
      emitChange({
        selectedRouteIndex: selectedIndex,
        routePolyline: row?.polyline || "",
        stopovers: [],
        distanceMeters: row?.distanceMeters,
        durationSeconds: row?.durationSeconds,
      });
      return;
    }

    try {
      const encoded = await getDirectionsPolyline(fromCoords, toCoords, stops, {
        from: fromLabel,
        to: toLabel,
      });
      if (encoded) {
        setRoutePolyline(encoded);
        emitChange({
          selectedRouteIndex: selectedIndex,
          routePolyline: encoded,
          stopovers: stops,
          distanceMeters: row?.distanceMeters,
          durationSeconds: row?.durationSeconds,
        });
      }
    } catch {
      emitChange({
        selectedRouteIndex: selectedIndex,
        routePolyline: row?.polyline || "",
        stopovers: stops,
        distanceMeters: row?.distanceMeters,
        durationSeconds: row?.durationSeconds,
      });
    }
  };

  const selectRoute = (index) => {
    const row = routes.find((r) => r.index === index);
    if (!row) return;
    setSelectedIndex(index);
    setRoutePolyline(row.polyline || "");
    setSelectedStopIds([]);
    setStopoverSearch("");
    emitChange({
      selectedRouteIndex: index,
      routePolyline: row.polyline,
      stopovers: [],
      distanceMeters: row.distanceMeters,
      durationSeconds: row.durationSeconds,
    });
  };

  const toggleStopover = async (candidate) => {
    const id = candidate.id;
    const nextIds = selectedStopIds.includes(id)
      ? selectedStopIds.filter((x) => x !== id)
      : [...selectedStopIds, id];
    await applyStopoverIds(nextIds);
  };

  const selectAllFiltered = async () => {
    const ids = filteredCandidates.map((c) => c.id);
    const merged = [...new Set([...selectedStopIds, ...ids])];
    await applyStopoverIds(merged);
  };

  const clearAllStopovers = async () => {
    setStopoverSearch("");
    await applyStopoverIds([]);
  };

  const endpointMarkers = useMemo(() => {
    const list = [];
    if (fromCoords?.lat != null && fromCoords?.lng != null) {
      list.push({
        id: "from",
        role: "route-from",
        latitude: fromCoords.lat,
        longitude: fromCoords.lng,
      });
    }
    if (toCoords?.lat != null && toCoords?.lng != null) {
      list.push({
        id: "to",
        role: "route-to",
        latitude: toCoords.lat,
        longitude: toCoords.lng,
      });
    }
    candidates
      .filter((c) => selectedStopIds.includes(c.id))
      .forEach((c) => {
        list.push({
          id: c.id,
          role: "stopover",
          latitude: c.lat,
          longitude: c.lng,
        });
      });
    return list;
  }, [fromCoords, toCoords, candidates, selectedStopIds]);

  if (!endpointsReady || !destinationsReady) {
    return (
      <Text style={styles.hint}>
        Select From and To from suggestions to see route options on the map.
      </Text>
    );
  }

  const { MapView, Marker, Polyline, PROVIDER_GOOGLE } = maps || {};

  const mapTitle =
    fullscreenTitle ||
    (fromLabel && toLabel ? `${fromLabel} → ${toLabel}` : "Route map");

  const renderMap = () => {
    const boxStyle = [styles.mapBox, isFullscreen && styles.mapBoxFullscreen];

    if (!maps?.MapView || loadingRoutes) {
      return (
        <View style={boxStyle} collapsable={false}>
          <View style={styles.mapLoader}>
            <ActivityIndicator
              color={theme?.sections?.route?.color || colors.primary}
              size="large"
            />
            <Text style={styles.loadingText}>
              {!maps?.MapView ? "Loading map…" : "Loading routes…"}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={boxStyle} collapsable={false}>
        <MapView
          key={`${fromCoords?.lat ?? ""}-${fromCoords?.lng ?? ""}-${toCoords?.lat ?? ""}-${toCoords?.lng ?? ""}`}
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={mapRegion}
          onMapReady={() => {
            setMapReady(true);
          }}
          scrollEnabled
          zoomEnabled
          zoomTapEnabled
          scrollDuringRotateOrZoom
          pitchEnabled={false}
          rotateEnabled={false}
          moveOnMarkerPress={false}
        >
          {decodedRoutes.map((route) => {
            const selected = route.index === selectedIndex;
            const color = selected ? SELECTED_ROUTE_COLOR : INACTIVE_ROUTE_COLOR;
            const pathCoords = (
              selected && activePath.length > 1 ? activePath : route.path
            ).filter(
              (c) =>
                c &&
                Number.isFinite(Number(c.latitude)) &&
                Number.isFinite(Number(c.longitude))
            );
            return pathCoords.length > 1 ? (
              <Polyline
                key={`route-${route.index}`}
                coordinates={pathCoords}
                strokeColor={color}
                strokeWidth={selected ? 6 : 4}
                geodesic
                lineCap="round"
                lineJoin="round"
              />
            ) : null;
          })}
          {endpointMarkers.map((pin) => (
            <Marker
              key={`pin-${pin.id}`}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <RouteMapPin role={pin.role} small={pin.role === "stopover"} />
            </Marker>
          ))}
        </MapView>
        {!isFullscreen && allowFullscreen ? (
          <Pressable
            style={styles.fullscreenBtn}
            onPress={() => setFullscreen(true)}
            accessibilityLabel="Open map fullscreen"
            hitSlop={8}
          >
            <Icon name="expand-outline" size={20} color={theme?.text || colors.text} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.wrap, isFullscreen && styles.wrapFullscreen]}>
      {isFullscreen ? (
        <View style={styles.fullscreenHeader}>
          <Pressable
            onPress={() => setFullscreen(false)}
            style={styles.fullscreenHeaderBtn}
            hitSlop={10}
            accessibilityLabel="Exit fullscreen map"
          >
            <Icon name="chevron-down" size={26} color={theme?.text || colors.text} />
          </Pressable>
          <Text style={styles.fullscreenTitle} numberOfLines={1}>
            {mapTitle}
          </Text>
          <View style={styles.fullscreenHeaderSpacer} />
        </View>
      ) : (
        <>
          <Text style={styles.title}>Choose your route</Text>
          <Text style={styles.subtitle}>
            Tap a route, then pick cities, towns, or villages along it.
          </Text>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {renderMap()}

      {routes.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeTabs}>
          {routes.map((route) => {
            const active = route.index === selectedIndex;
            return (
              <Pressable
                key={`tab-${route.index}`}
                style={[styles.routeCard, active && styles.routeCardActive]}
                onPress={() => selectRoute(route.index)}
              >
                <Text style={[styles.routeCardTitle, active && styles.routeCardTitleActive]}>
                  {route.label || `Route ${route.index + 1}`}
                </Text>
                <Text style={styles.routeCardMeta}>
                  {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {isFullscreen && routes.length > 0 ? (
        <Text style={styles.fullscreenHint}>
          Tap a route card above · exit fullscreen to add stopovers
        </Text>
      ) : null}

      {!isFullscreen && rideDate && routePolyline ? (
        <View style={styles.enrouteBox}>
          <Text style={styles.enrouteTitle}>En route along this route</Text>
          {enroutePreview.loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.enrouteMeta}>
              {enroutePreview.counts.total} open request
              {enroutePreview.counts.total === 1 ? "" : "s"} ·{" "}
              {enroutePreview.counts.passengers} passenger ·{" "}
              {enroutePreview.counts.couriers} courier
            </Text>
          )}
        </View>
      ) : null}

      {!isFullscreen ? <Text style={styles.stopTitle}>Stopovers along route</Text> : null}
      {!isFullscreen && candidates.length > 0 ? (
        <View style={styles.stopToolbar}>
          <TextInput
            value={stopoverSearch}
            onChangeText={setStopoverSearch}
            placeholder="Search stopovers…"
            placeholderTextColor={theme?.textMuted || colors.textMuted}
            style={styles.stopSearch}
          />
          <View style={styles.stopActions}>
            <Pressable
              style={styles.stopActionBtn}
              onPress={selectAllFiltered}
              disabled={!filteredCandidates.length}
            >
              <Text style={styles.stopActionText}>Select all</Text>
            </Pressable>
            <Pressable
              style={styles.stopActionBtn}
              onPress={clearAllStopovers}
              disabled={!selectedStopIds.length}
            >
              <Text style={styles.stopActionText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {!isFullscreen && loadingStops ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
      ) : !isFullscreen && candidates.length === 0 ? (
        <Text style={styles.hint}>No cities, towns, or villages found on this route.</Text>
      ) : !isFullscreen && filteredCandidates.length === 0 ? (
        <Text style={styles.hint}>No stopovers match your search.</Text>
      ) : !isFullscreen ? (
        <View style={styles.chips}>
          {filteredCandidates.map((c) => {
            const active = selectedStopIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleStopover(c)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme, colors) =>
  StyleSheet.create({
    wrap: { marginTop: DS.spacing.md },
    wrapFullscreen: {
      flex: 1,
      marginTop: 0,
    },
    fullscreenHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 4,
      paddingBottom: 6,
      backgroundColor: theme?.surface || colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme?.cardBorder || colors.border,
    },
    fullscreenHeaderBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    fullscreenTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "700",
      color: theme?.text || colors.text,
      textAlign: "center",
    },
    fullscreenHeaderSpacer: {
      width: 40,
    },
    title: {
      fontSize: DS.font.label,
      fontWeight: "700",
      color: theme?.text || colors.text,
    },
    subtitle: {
      fontSize: DS.font.small,
      color: theme?.textMuted || colors.textMuted,
      marginTop: 4,
      marginBottom: DS.spacing.sm,
    },
    hint: {
      fontSize: DS.font.small,
      color: theme?.textMuted || colors.textMuted,
      marginTop: DS.spacing.sm,
    },
    loadingBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: DS.spacing.sm,
    },
    loadingText: { fontSize: DS.font.small, color: theme?.textMuted || colors.textMuted },
    errorText: { color: colors.error || "#EF4444", fontSize: DS.font.small, marginBottom: 8 },
    mapBox: {
      height: 220,
      borderRadius: DS.radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      marginBottom: DS.spacing.sm,
    },
    mapBoxFullscreen: {
      flex: 1,
      height: undefined,
      minHeight: 280,
      borderRadius: 0,
      marginBottom: DS.spacing.sm,
    },
    map: { flex: 1 },
    mapLoader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: theme?.surfaceAlt || colors.surfaceAlt,
    },
    fullscreenBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 25,
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme?.surface || colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      elevation: 4,
    },
    routeTabs: { marginBottom: DS.spacing.md },
    fullscreenHint: {
      fontSize: DS.font.small,
      color: theme?.textMuted || colors.textMuted,
      textAlign: "center",
      marginBottom: DS.spacing.sm,
      paddingHorizontal: DS.spacing.sm,
    },
    routeCard: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: DS.radius.md,
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      backgroundColor: theme?.surfaceAlt || colors.surfaceAlt,
      marginRight: 8,
      minWidth: 120,
    },
    routeCardActive: {
      borderColor: theme?.sections?.route?.color || colors.primary,
      backgroundColor: theme?.surface || colors.surface,
    },
    routeCardTitle: {
      fontSize: DS.font.small,
      fontWeight: "700",
      color: theme?.text || colors.text,
    },
    routeCardTitleActive: {
      color: theme?.sections?.route?.color || colors.primary,
    },
    routeCardMeta: {
      fontSize: 11,
      color: theme?.textMuted || colors.textMuted,
      marginTop: 4,
    },
    enrouteBox: {
      marginBottom: DS.spacing.md,
      padding: DS.spacing.sm,
      borderRadius: DS.radius.md,
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      backgroundColor: theme?.surfaceAlt || colors.surfaceAlt,
    },
    enrouteTitle: {
      fontSize: DS.font.small,
      fontWeight: "700",
      color: theme?.text || colors.text,
    },
    enrouteMeta: {
      fontSize: DS.font.small,
      color: theme?.textMuted || colors.textMuted,
      marginTop: 4,
    },
    stopTitle: {
      fontSize: DS.font.label,
      fontWeight: "700",
      color: theme?.text || colors.text,
      marginBottom: DS.spacing.sm,
    },
    stopToolbar: {
      marginBottom: DS.spacing.sm,
      gap: 8,
    },
    stopSearch: {
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      borderRadius: DS.radius.md,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      fontSize: DS.font.small,
      color: theme?.text || colors.text,
      backgroundColor: theme?.surface || colors.surface,
    },
    stopActions: {
      flexDirection: "row",
      gap: 8,
    },
    stopActionBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: DS.radius.md,
      borderWidth: 1,
      borderColor: theme?.sections?.route?.color || colors.primary,
    },
    stopActionText: {
      fontSize: DS.font.small,
      fontWeight: "600",
      color: theme?.sections?.route?.color || colors.primary,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      backgroundColor: theme?.surfaceAlt || colors.surfaceAlt,
    },
    chipActive: {
      borderColor: theme?.sections?.route?.color || colors.primary,
      backgroundColor: theme?.sections?.route?.bg || colors.tintBlue,
    },
    chipText: {
      fontSize: DS.font.small,
      color: theme?.text || colors.text,
      fontWeight: "600",
    },
    chipTextActive: {
      color: theme?.sections?.route?.color || colors.primary,
    },
  });
