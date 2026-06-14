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
  resolvePlaceCoords,
} from "../../ApiService/placesApiService";
import { decodePolyline, thinPolylineCoords, validMapCoords, polylinePathLengthMeters } from "../../Utils/polyline";
import { regionForCoordinates } from "./rideMapMarkers";
import RouteMapPin from "./RouteMapPin";
import { ROUTE_LINE_BLUE, ROUTE_LINE_BLUE_OUTLINE } from "./mapTheme";
import { useTheme } from "../../context/ThemeContext";
import { DS } from "../../theme/designSystem";

const SELECTED_ROUTE_COLOR = ROUTE_LINE_BLUE;
const SELECTED_ROUTE_OUTLINE = ROUTE_LINE_BLUE_OUTLINE;
/** Neutral gray — must not read as blue so the selected route stands out. */
const INACTIVE_ROUTE_COLOR = "#64748B";
const INACTIVE_ROUTE_DASH = [12, 8];
const ROUTE_HIT_STROKE_WIDTH = 18;
const ROUTE_FETCH_DEBOUNCE_MS = 450;
const MAP_PATH_MAX_POINTS = 140;
const MAP_FIT_DEBOUNCE_MS = 120;

const RoutePickerMapLayers = React.memo(function RoutePickerMapLayers({
  MapView,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  endpointSignature,
  mapRegion,
  mapRef,
  inactiveRoutes,
  activePath,
  selectedIndex,
  endpointMarkers,
  onMapReady,
  onSelectRoute,
}) {
  return (
    <MapView
      key={endpointSignature}
      ref={mapRef}
      style={{ flex: 1 }}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      initialRegion={mapRegion}
      onMapReady={onMapReady}
      scrollEnabled
      zoomEnabled
      zoomTapEnabled
      scrollDuringRotateOrZoom
      pitchEnabled={false}
      rotateEnabled={false}
      moveOnMarkerPress={false}
      loadingEnabled={false}
      cacheEnabled={Platform.OS === "ios"}
      toolbarEnabled={false}
    >
      {inactiveRoutes.map((route) => (
        <React.Fragment key={`route-inactive-${selectedIndex}-${route.arrayIndex}`}>
          <Polyline
            coordinates={route.mapPath}
            strokeColor={INACTIVE_ROUTE_COLOR}
            strokeWidth={4}
            geodesic
            lineCap="round"
            lineJoin="round"
            lineDashPattern={INACTIVE_ROUTE_DASH}
            zIndex={1}
          />
          <Polyline
            coordinates={route.mapPath}
            strokeColor="rgba(0,0,0,0)"
            strokeWidth={ROUTE_HIT_STROKE_WIDTH}
            geodesic
            lineCap="round"
            lineJoin="round"
            tappable
            onPress={() => onSelectRoute(route.arrayIndex)}
            zIndex={6}
          />
        </React.Fragment>
      ))}
      {activePath.length > 1 ? (
        <React.Fragment key={`route-selected-${selectedIndex}`}>
          <Polyline
            coordinates={activePath}
            strokeColor={SELECTED_ROUTE_OUTLINE}
            strokeWidth={11}
            geodesic
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
          <Polyline
            coordinates={activePath}
            strokeColor={SELECTED_ROUTE_COLOR}
            strokeWidth={7}
            geodesic
            lineCap="round"
            lineJoin="round"
            zIndex={4}
          />
          <Polyline
            coordinates={activePath}
            strokeColor="rgba(0,0,0,0)"
            strokeWidth={ROUTE_HIT_STROKE_WIDTH}
            geodesic
            lineCap="round"
            lineJoin="round"
            tappable
            onPress={() => onSelectRoute(selectedIndex)}
            zIndex={5}
          />
        </React.Fragment>
      ) : null}
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
  );
});

/** Prefer Google/API road distance; polyline length is only a fallback. */
const distanceFromPolyline = (polyline, fallback) => {
  const fb = Number(fallback);
  if (Number.isFinite(fb) && fb > 0) return Math.round(fb);
  const computed = polylinePathLengthMeters(String(polyline || ""));
  if (computed > 0) return Math.round(computed);
  return null;
};

/** Stable 0..n-1 indices; ensure distance from polyline when API omits it. */
const normalizeRouteList = (list) =>
  (Array.isArray(list) ? list : []).map((route, idx) => {
    const polyline = route?.polyline || "";
    const distanceMeters = distanceFromPolyline(polyline, route?.distanceMeters);
    return {
      ...route,
      index: idx,
      polyline,
      distanceMeters,
    };
  });

const buildRoutePlan = (row, overrides = {}) => {
  const polyline = String(overrides.routePolyline ?? row?.polyline ?? "").trim();
  const distanceMeters = distanceFromPolyline(
    polyline,
    overrides.distanceMeters ?? row?.distanceMeters
  );
  return {
    selectedRouteIndex: overrides.selectedRouteIndex ?? row?.index ?? 0,
    routePolyline: polyline,
    stopovers: overrides.stopovers ?? [],
    distanceMeters,
    distanceKm:
      distanceMeters != null ? Math.round((distanceMeters / 1000) * 100) / 100 : null,
    durationSeconds: overrides.durationSeconds ?? row?.durationSeconds ?? null,
  };
};

const resolveEndpoint = async (coords, label, originCoords = null) => {
  const lat = Number(coords?.lat ?? coords?.latitude);
  const lng = Number(coords?.lng ?? coords?.longitude);
  const placeLabel = String(label || coords?.label || "").trim();
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng, label: placeLabel || undefined };
  }
  if (!placeLabel) return null;
  return resolvePlaceCoords(placeLabel, originCoords);
};

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
  const [updatingRoute, setUpdatingRoute] = useState(false);
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

  const endpointSignature = useMemo(
    () =>
      [
        fromCoords?.lat ?? "",
        fromCoords?.lng ?? "",
        toCoords?.lat ?? "",
        toCoords?.lng ?? "",
        String(fromLabel || "").trim(),
        String(toLabel || "").trim(),
      ].join("|"),
    [
      fromCoords?.lat,
      fromCoords?.lng,
      toCoords?.lat,
      toCoords?.lng,
      fromLabel,
      toLabel,
    ]
  );

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
    const timer = setTimeout(() => {
      setLoadingRoutes(true);
      setError("");

      (async () => {
        try {
          const origin = await resolveEndpoint(fromCoords, fromLabel);
          const destination = await resolveEndpoint(toCoords, toLabel, origin);
          if (cancelled) return;

          let list = await getAlternativeRoutes(origin, destination, {
            from: fromLabel,
            to: toLabel,
          });
          if (cancelled) return;

          if (!list.length) {
            const encoded = await getDirectionsPolyline(origin, destination, [], {
              from: fromLabel,
              to: toLabel,
            });
            if (cancelled) return;
            if (encoded) {
              list = [
                {
                  index: 0,
                  polyline: encoded,
                  label: "Recommended",
                  isRecommended: true,
                  distanceMeters: null,
                  durationSeconds: null,
                },
              ];
            }
          }

          if (!list.length) {
            throw new Error("No routes found for this trip. Try different From/To places.");
          }

          if (!origin || !destination) {
            throw new Error("Could not resolve From and To for routing.");
          }

          if (__DEV__) {
            console.log("[RouteStopoversPicker] routes loaded:", list.length);
          }

          setRoutes(normalizeRouteList(list));
          const normalized = normalizeRouteList(list);
          const first = normalized[0];
          setSelectedIndex(0);
          setRoutePolyline(first?.polyline || "");
          setSelectedStopIds([]);
          setStopoverSearch("");
          emitChange(first ? buildRoutePlan(first) : null);
        } catch (e) {
          if (!cancelled) {
            setError(e?.message || "Could not load routes");
            setRoutes([]);
          }
        } finally {
          if (!cancelled) setLoadingRoutes(false);
        }
      })();
    }, ROUTE_FETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [endpointsReady, destinationsReady, endpointSignature, emitChange]);

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
      routes.map((route) => {
        const path = validMapCoords(
          route.polyline ? decodePolyline(route.polyline) : []
        );
        return {
          ...route,
          path,
          mapPath: thinPolylineCoords(path, MAP_PATH_MAX_POINTS),
        };
      }),
    [routes]
  );

  const selectedRoute = decodedRoutes[selectedIndex] || null;

  const basePath = useMemo(() => {
    return selectedRoute?.path?.length > 1 ? selectedRoute.path : [];
  }, [selectedRoute]);

  const activePath = useMemo(() => {
    const adjusted = validMapCoords(
      routePolyline ? decodePolyline(routePolyline) : []
    );
    const base = adjusted.length > 1 ? adjusted : basePath;
    return thinPolylineCoords(base, MAP_PATH_MAX_POINTS);
  }, [routePolyline, basePath]);

  const inactiveRoutes = useMemo(
    () =>
      decodedRoutes
        .map((route, arrayIndex) => ({
          arrayIndex,
          mapPath: route.mapPath,
        }))
        .filter(
          (route) => route.arrayIndex !== selectedIndex && route.mapPath.length > 1
        ),
    [decodedRoutes, selectedIndex]
  );

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
  }, [endpointSignature]);

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

    const row = routes[selectedIndex];
    if (!stops.length) {
      setRoutePolyline(row?.polyline || "");
      emitChange(buildRoutePlan(row, { stopovers: [] }));
      return;
    }

    setUpdatingRoute(true);
    try {
      const encoded = await getDirectionsPolyline(fromCoords, toCoords, stops, {
        from: fromLabel,
        to: toLabel,
      });
      if (encoded) {
        setRoutePolyline(encoded);
        emitChange(
          buildRoutePlan(row, {
            selectedRouteIndex: selectedIndex,
            routePolyline: encoded,
            stopovers: stops,
          })
        );
      }
    } catch {
      emitChange(
        buildRoutePlan(row, {
          selectedRouteIndex: selectedIndex,
          stopovers: stops,
        })
      );
    } finally {
      setUpdatingRoute(false);
    }
  };

  const selectRoute = useCallback(
    (arrayIndex) => {
      const nextIndex = Number(arrayIndex);
      if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= routes.length) {
        return;
      }
      const row = routes[nextIndex];
      if (!row) return;
      if (nextIndex === selectedIndex && !selectedStopIds.length) return;

      setSelectedIndex(nextIndex);
      setRoutePolyline(row.polyline || "");
      setSelectedStopIds([]);
      setStopoverSearch("");
      emitChange(buildRoutePlan(row, { selectedRouteIndex: nextIndex, stopovers: [] }));
    },
    [routes, selectedIndex, selectedStopIds.length, emitChange]
  );

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapFitCoords.length < 2) return undefined;
    const timer = setTimeout(() => {
      try {
        mapRef.current?.fitToCoordinates(mapFitCoords, {
          edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
          animated: true,
        });
      } catch {
        /* ignore */
      }
    }, MAP_FIT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [mapReady, selectedIndex, mapFitCoords]);

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

  const mapBusy = !maps?.MapView || loadingRoutes || updatingRoute || !mapReady;

  const mapLoaderMessage = useMemo(() => {
    if (!maps?.MapView) return "Loading map…";
    if (loadingRoutes) return "Finding route options…";
    if (updatingRoute) return "Updating route…";
    if (!mapReady) return "Loading map…";
    return "";
  }, [maps?.MapView, loadingRoutes, updatingRoute, mapReady]);

  if (!endpointsReady || !destinationsReady) {
    return (
      <Text style={styles.hint}>
        Select From and To from suggestions to see route options on the map.
      </Text>
    );
  }

  const mapTitle =
    fullscreenTitle ||
    (fromLabel && toLabel ? `${fromLabel} → ${toLabel}` : "Route map");

  const renderMap = () => {
    const boxStyle = [styles.mapBox, isFullscreen && styles.mapBoxFullscreen];

    if (!maps?.MapView) {
      return (
        <View style={boxStyle} collapsable={false}>
          <View style={styles.mapLoader}>
            <ActivityIndicator
              color={theme?.sections?.route?.color || colors.primary}
              size="large"
            />
            <Text style={styles.loadingText}>Loading map…</Text>
          </View>
        </View>
      );
    }

    const { MapView, Marker, Polyline, PROVIDER_GOOGLE } = maps;

    return (
      <View style={boxStyle} collapsable={false}>
        <RoutePickerMapLayers
          MapView={MapView}
          Marker={Marker}
          Polyline={Polyline}
          PROVIDER_GOOGLE={PROVIDER_GOOGLE}
          endpointSignature={endpointSignature}
          mapRegion={mapRegion}
          mapRef={mapRef}
          inactiveRoutes={inactiveRoutes}
          activePath={activePath}
          selectedIndex={selectedIndex}
          endpointMarkers={endpointMarkers}
          onMapReady={handleMapReady}
          onSelectRoute={selectRoute}
        />
        {mapBusy ? (
          <View style={styles.mapOverlay} pointerEvents="auto">
            <View style={styles.mapOverlayCard}>
              <ActivityIndicator
                color={theme?.sections?.route?.color || colors.primary}
                size="large"
              />
              <Text style={styles.mapOverlayText}>{mapLoaderMessage}</Text>
            </View>
          </View>
        ) : null}
        {!isFullscreen && allowFullscreen && !mapBusy ? (
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

  const renderRouteTabs = () => {
    if (loadingRoutes) {
      return (
        <View style={styles.routeTabsLoading}>
          <ActivityIndicator
            size="small"
            color={theme?.sections?.route?.color || colors.primary}
          />
          <Text style={styles.routeTabsLoadingText}>Loading route options…</Text>
        </View>
      );
    }

    if (!routes.length) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.routeTabs}
        contentContainerStyle={styles.routeTabsContent}
      >
        {routes.map((route, arrayIndex) => {
          const active = arrayIndex === selectedIndex;
          return (
            <Pressable
              key={`tab-${arrayIndex}`}
              style={[
                styles.routeCard,
                active ? styles.routeCardActive : styles.routeCardInactive,
                active && { borderColor: SELECTED_ROUTE_COLOR },
              ]}
              onPress={() => selectRoute(arrayIndex)}
            >
              <Text
                style={[
                  styles.routeCardTitle,
                  active ? styles.routeCardTitleActive : styles.routeCardTitleInactive,
                  active && { color: SELECTED_ROUTE_COLOR },
                ]}
              >
                {route.label || `Route ${arrayIndex + 1}`}
              </Text>
              <Text style={styles.routeCardMeta}>
                {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  const renderRouteCount = () => {
    if (loadingRoutes) return null;
    if (routes.length > 1) {
      return (
        <Text style={styles.routeCount}>
          {routes.length} routes available — tap a line on the map or a card below; solid{" "}
          <Text style={styles.routeCountBlue}>blue line</Text> is your selection
        </Text>
      );
    }
    if (routes.length === 1) {
      return (
        <Text style={styles.routeCount}>
          1 route found — select it below to continue
        </Text>
      );
    }
    return null;
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
            Pick a route option card below the map. Add stopovers after you choose.
          </Text>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isFullscreen ? (
        <>
          <View style={styles.routePickerSection}>
            {renderRouteCount()}
            {renderRouteTabs()}
          </View>
          <View style={styles.mapBody}>{renderMap()}</View>
          {routes.length > 0 ? (
            <Text style={styles.fullscreenHint}>
              Tap a route card below to select · exit fullscreen to add stopovers
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {renderRouteCount()}
          {renderMap()}
          <View style={styles.routePickerSection}>
            {renderRouteTabs()}
          </View>
        </>
      )}

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
        <Text style={styles.hint}>No cities or towns found on this route.</Text>
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
      minHeight: 0,
    },
    routePickerSection: {
      flexShrink: 0,
    },
    mapBody: {
      flex: 1,
      minHeight: 0,
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
      height: 280,
      borderRadius: DS.radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      marginBottom: DS.spacing.sm,
    },
    mapBoxFullscreen: {
      flex: 1,
      height: undefined,
      minHeight: 0,
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
    mapOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.28)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
    },
    mapOverlayCard: {
      minWidth: 168,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: DS.radius.lg,
      backgroundColor: theme?.surface || colors.surface,
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: theme?.cardBorder || colors.border,
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    mapOverlayText: {
      fontSize: DS.font.small,
      fontWeight: "600",
      color: theme?.text || colors.text,
      textAlign: "center",
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
    routeTabs: { marginBottom: DS.spacing.sm, marginTop: DS.spacing.sm },
    routeTabsContent: { paddingVertical: 2 },
    routeTabsLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: DS.spacing.sm,
      marginTop: DS.spacing.sm,
    },
    routeTabsLoadingText: {
      fontSize: DS.font.small,
      color: theme?.textMuted || colors.textMuted,
    },
    routeCount: {
      fontSize: DS.font.small,
      color: theme?.textMuted || colors.textMuted,
      marginBottom: DS.spacing.sm,
      fontWeight: "600",
    },
    routeCountBlue: {
      color: SELECTED_ROUTE_COLOR,
      fontWeight: "800",
    },
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
    routeCardInactive: {
      borderColor: theme?.cardBorder || colors.border,
      backgroundColor: theme?.surfaceAlt || colors.surfaceAlt,
    },
    routeCardTitle: {
      fontSize: DS.font.small,
      fontWeight: "700",
      color: theme?.text || colors.text,
    },
    routeCardTitleActive: {
      color: theme?.sections?.route?.color || colors.primary,
    },
    routeCardTitleInactive: {
      color: theme?.text || colors.text,
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
