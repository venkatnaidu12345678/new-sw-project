import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import Config from "react-native-config";
import {
  buildMarkersFromTracking,
  buildRouteEndpointMarkers,
  buildStopoverMarkers,
  regionForCoordinates,
  DEFAULT_MAP_CENTER,
  getDriverMapPoint,
  computeBearing,
  getDriverHeadingFromHistory,
} from "./rideMapMarkers";
import RideMapMarkerIcon from "./RideMapMarkerIcon";
import RouteMapPin from "./RouteMapPin";
import LiveMapMarker from "./LiveMapMarker";
import DriverNavMarker from "./DriverNavMarker";
import { MAP_LINE_THEME } from "./mapTheme";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { DARK_GOOGLE_MAP_STYLE } from "../../theme/mapStyles";
import { getCachedCoords, subscribeGpsUpdates } from "../../Utils/gpsService";
import { useDeviceHeading } from "../../hooks/useDeviceHeading";

const googleMapsKey = (Config.GOOGLE_MAPS_API_KEY || "").trim();
const LIVE_MARKER_ROLES = new Set(["driver", "passenger", "courier"]);
const DRIVER_3D_PITCH = 64;
const DRIVER_3D_ZOOM = 17.5;
const DRIVER_3D_ALTITUDE = 420;
const HEADING_SYNC_MS = 160;
const GESTURE_COOLDOWN_MS = 2000;
const NAV_MAP_PADDING = { top: 72, right: 48, bottom: 200, left: 48 };

const validMapCoords = (coords = []) =>
  coords.filter(
    (c) =>
      c &&
      Number.isFinite(Number(c.latitude)) &&
      Number.isFinite(Number(c.longitude))
  );

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
 * Live Google Map with optional fullscreen (expand) mode.
 */
const GoogleRideMap = ({
  tracking,
  myRole,
  style,
  height = 280,
  fill = false,
  showMyLocation = false,
  gpsStatusText,
  allowFullscreen = true,
  fullscreenTitle = "Live map",
  plannedRoute = [],
  fromCoords = null,
  toCoords = null,
  stopovers = [],
  participantJourneyPath = [],
  driverToParticipantPath = [],
  participantEndpointMarkers = [],
  navigationTargetMarker = null,
  participantNavActive = false,
  driverControls = false,
  driverPickOnly = false,
  defaultRideView = false,
  routeFitNonce = 0,
  isFullscreen: isFullscreenControlled,
  onFullscreenChange,
  loading = false,
  loadingText = "Loading map…",
}) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const initialRegionRef = useRef(null);
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = isFullscreenControlled ?? internalFullscreen;
  const [is3DMode, setIs3DMode] = useState(false);
  const [showRoutes, setShowRoutes] = useState(() => !!driverControls);
  const [myGpsCoord, setMyGpsCoord] = useState(null);
  const prev3DModeRef = useRef(false);
  const did3DInitialFocusRef = useRef(false);
  const userGesturingRef = useRef(false);
  const gestureCooldownUntilRef = useRef(0);
  const programmaticCameraRef = useRef(false);
  const lastHeadingSyncRef = useRef(0);
  const is3DModeRef = useRef(false);
  const { maps, loadError } = useMapsModule();
  const { isDark, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const useGoogleProvider =
    Platform.OS === "android" || (Platform.OS === "ios" && !!googleMapsKey);

  const viewerRole = (myRole || "").toString().toLowerCase();
  const isDriverView = viewerRole === "driver";

  const { markers, path, hasRemoteMarkers } = useMemo(() => {
    const built = buildMarkersFromTracking(tracking, myRole);
    const routeMarkers = buildRouteEndpointMarkers(fromCoords, toCoords);
    const stopMarkers = buildStopoverMarkers(stopovers);
    const liveIds = new Set(built.markers.map((m) => m.id));
    const mergedRouteMarkers = [...routeMarkers, ...stopMarkers].filter(
      (m) => !liveIds.has(m.id)
    );

    return {
      ...built,
      markers: [...built.markers, ...mergedRouteMarkers],
      hasRemoteMarkers: built.markers.length > 0,
    };
  }, [tracking, myRole, fromCoords, toCoords, stopovers]);

  const driverPoint = useMemo(() => getDriverMapPoint(tracking), [tracking]);

  const hasAnyoneOnMap =
    hasRemoteMarkers || (isDriverView && !!driverPoint);

  const visibleMarkers = useMemo(() => {
    if (showMyLocation && !isDriverView) {
      return markers.filter((m) => !m.isMe);
    }
    return markers;
  }, [markers, showMyLocation, isDriverView]);

  /** Custom heading arrow for driver; passengers see driver pin with arrow. */
  const showDriverArrow = isDriverView && !!showMyLocation;

  /** Native GPS dot when not using the custom driver arrow. */
  const showNativeMyLocation = !!showMyLocation && !showDriverArrow;

  const bootstrapCoords = useMemo(() => {
    const coords = [];
    if (fromCoords?.lat != null && fromCoords?.lng != null) {
      coords.push({ latitude: fromCoords.lat, longitude: fromCoords.lng });
    }
    if (toCoords?.lat != null && toCoords?.lng != null) {
      coords.push({ latitude: toCoords.lat, longitude: toCoords.lng });
    }
    (Array.isArray(stopovers) ? stopovers : []).forEach((s) => {
      const lat = Number(s?.lat ?? s?.latitude);
      const lng = Number(s?.lng ?? s?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords.push({ latitude: lat, longitude: lng });
      }
    });
    return coords;
  }, [fromCoords, toCoords, stopovers]);

  const plannedPath = useMemo(
    () => (Array.isArray(plannedRoute) ? plannedRoute.filter(Boolean) : []),
    [plannedRoute]
  );

  const displayPlannedPath = useMemo(() => {
    if (plannedPath.length > 1) return plannedPath;
    if (defaultRideView && bootstrapCoords.length >= 2) {
      return bootstrapCoords.map((c) => ({
        latitude: c.latitude,
        longitude: c.longitude,
      }));
    }
    return [];
  }, [plannedPath, defaultRideView, bootstrapCoords]);

  /** Default ride view: full from→to blue route; participant nav hides it. */
  const showPlannedRideRoute =
    showRoutes && !participantNavActive && displayPlannedPath.length > 1;
  const showGpsTrail = showRoutes && !driverPickOnly && path.length > 1;

  const participantPath = useMemo(
    () =>
      Array.isArray(participantJourneyPath)
        ? participantJourneyPath.filter(Boolean)
        : [],
    [participantJourneyPath]
  );

  const driverLegPath = useMemo(
    () =>
      Array.isArray(driverToParticipantPath)
        ? driverToParticipantPath.filter(Boolean)
        : [],
    [driverToParticipantPath]
  );

  const showDriverLegRoute =
    showRoutes && participantNavActive && driverLegPath.length > 1;

  const participantMarkers = useMemo(() => {
    const base = Array.isArray(participantEndpointMarkers)
      ? participantEndpointMarkers
      : [];
    if (navigationTargetMarker?.latitude != null && navigationTargetMarker?.longitude != null) {
      const exists = base.some((m) => m.id === navigationTargetMarker.id);
      if (!exists) return [...base, navigationTargetMarker];
    }
    return base;
  }, [participantEndpointMarkers, navigationTargetMarker]);

  const selfCoord = useMemo(() => {
    if (myGpsCoord?.latitude != null && myGpsCoord?.longitude != null) {
      return myGpsCoord;
    }
    if (driverPoint) {
      return { latitude: driverPoint.lat, longitude: driverPoint.lng };
    }
    return null;
  }, [myGpsCoord, driverPoint]);

  const resolveHeadingTowardRoute = useCallback(
    (lat, lng) => {
      if (participantNavActive && driverLegPath.length > 1) {
        const next = driverLegPath[1];
        return computeBearing(lat, lng, next.latitude, next.longitude);
      }
      if (plannedPath.length > 1) {
        const next = plannedPath[1];
        return computeBearing(lat, lng, next.latitude, next.longitude);
      }
      if (toCoords?.lat != null && toCoords?.lng != null) {
        return computeBearing(lat, lng, toCoords.lat, toCoords.lng);
      }
      return 0;
    },
    [plannedPath, toCoords, participantNavActive, driverLegPath]
  );

  const selfHeading = useDeviceHeading({
    enabled: showDriverArrow,
    latitude: selfCoord?.latitude,
    longitude: selfCoord?.longitude,
  });

  /** In 3D nav the map rotates — puck stays pointing up on screen. */
  const driverNavigationView = is3DMode && isDriverView && showDriverArrow;
  const driverMarkerHeading = driverNavigationView ? 0 : selfHeading;

  const remoteDriverHeading = useMemo(() => {
    const fromHistory = getDriverHeadingFromHistory(tracking);
    if (fromHistory != null) return fromHistory;
    if (driverPoint) {
      return resolveHeadingTowardRoute(driverPoint.lat, driverPoint.lng);
    }
    return 0;
  }, [tracking, driverPoint, resolveHeadingTowardRoute]);

  useEffect(() => {
    if (!showDriverArrow) return undefined;

    const applyCoords = (coords) => {
      if (!coords) return;
      setMyGpsCoord({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    };

    const cached = getCachedCoords();
    if (cached) applyCoords(cached);

    return subscribeGpsUpdates(applyCoords);
  }, [showDriverArrow]);

  const runMapCamera = useCallback((payload, animated = true) => {
    const map = mapRef.current;
    if (!map || !payload?.center) return;

    try {
      programmaticCameraRef.current = true;
      if (Platform.OS === "android" && map.setCamera) {
        map.setCamera(payload);
      } else if (map.animateCamera) {
        map.animateCamera(payload, animated ? { duration: 320 } : { duration: 0 });
      }
      setTimeout(() => {
        programmaticCameraRef.current = false;
      }, animated ? 360 : 50);
    } catch {
      programmaticCameraRef.current = false;
    }
  }, []);

  const apply3DExit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = (camera = {}) => {
      const center = camera.center || selfCoord;
      if (!center?.latitude || !center?.longitude) return;

      runMapCamera({
        center: {
          latitude: center.latitude,
          longitude: center.longitude,
        },
        pitch: 0,
        heading: 0,
        zoom: Number.isFinite(camera.zoom) ? camera.zoom : 16,
        ...(Platform.OS === "ios" && {
          altitude: Number.isFinite(camera.altitude) ? camera.altitude : 1000,
        }),
      });
    };

    if (map.getCamera) {
      Promise.resolve(map.getCamera())
        .then(apply)
        .catch(() => apply({}));
      return;
    }

    apply({});
  }, [selfCoord, runMapCamera]);

  const focus3DOnce = useCallback(() => {
    if (did3DInitialFocusRef.current || !is3DModeRef.current) return;

    const map = mapRef.current;
    if (!map) return;

    const applyNavCamera = (center) => {
      if (!center?.latitude || !center?.longitude) return;
      did3DInitialFocusRef.current = true;
      runMapCamera({
        center: {
          latitude: center.latitude,
          longitude: center.longitude,
        },
        pitch: DRIVER_3D_PITCH,
        heading: selfHeading,
        zoom: DRIVER_3D_ZOOM,
        ...(Platform.OS === "ios" && {
          altitude: DRIVER_3D_ALTITUDE,
        }),
      });
    };

    if (selfCoord) {
      applyNavCamera(selfCoord);
      return;
    }

    const fitCoords = validMapCoords(bootstrapCoords);
    if (fitCoords.length === 0) return;

    const targets =
      fitCoords.length > 1
        ? [fitCoords[0], fitCoords[fitCoords.length - 1]]
        : fitCoords;

    const afterFit = () => {
      programmaticCameraRef.current = false;
      applyNavCamera(selfCoord || fitCoords[0]);
    };

    try {
      programmaticCameraRef.current = true;
      if (map.fitToCoordinates) {
        map.fitToCoordinates(targets, {
          edgePadding: NAV_MAP_PADDING,
          animated: true,
        });
        setTimeout(afterFit, 480);
        return;
      }
      if (map.animateToRegion) {
        map.animateToRegion(regionForCoordinates(targets), 400);
        setTimeout(afterFit, 420);
      }
    } catch {
      programmaticCameraRef.current = false;
      applyNavCamera(fitCoords[0]);
    }
  }, [selfCoord, selfHeading, bootstrapCoords, runMapCamera]);

  const sync3DHeading = useCallback(
    (heading) => {
      if (
        !did3DInitialFocusRef.current ||
        !is3DModeRef.current ||
        userGesturingRef.current ||
        Date.now() < gestureCooldownUntilRef.current
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastHeadingSyncRef.current < HEADING_SYNC_MS) return;
      lastHeadingSyncRef.current = now;

      const map = mapRef.current;
      if (!map?.getCamera) return;

      Promise.resolve(map.getCamera())
        .then((camera) => {
          if (!camera?.center) return;
          const current = Number.isFinite(camera.heading) ? camera.heading : 0;
          const delta = Math.abs(((heading - current + 540) % 360) - 180);
          if (delta < 1.5) return;

          runMapCamera(
            {
              center: camera.center,
              pitch: Number.isFinite(camera.pitch) ? camera.pitch : DRIVER_3D_PITCH,
              heading,
              zoom: Number.isFinite(camera.zoom) ? camera.zoom : DRIVER_3D_ZOOM,
              ...(Platform.OS === "ios" && {
                altitude: Number.isFinite(camera.altitude)
                  ? camera.altitude
                  : DRIVER_3D_ALTITUDE,
              }),
            },
            true
          );
        })
        .catch(() => {});
    },
    [runMapCamera]
  );

  useEffect(() => {
    is3DModeRef.current = is3DMode;
  }, [is3DMode]);

  useEffect(() => {
    if (!driverNavigationView || !mapReady) return;
    sync3DHeading(selfHeading);
  }, [driverNavigationView, mapReady, selfHeading, sync3DHeading]);

  if (!initialRegionRef.current && bootstrapCoords.length > 0) {
    initialRegionRef.current = regionForCoordinates(bootstrapCoords);
  }

  useEffect(() => {
    if (!mapReady || prev3DModeRef.current === is3DMode) return;
    prev3DModeRef.current = is3DMode;
    if (is3DMode) {
      did3DInitialFocusRef.current = false;
    } else {
      did3DInitialFocusRef.current = false;
      apply3DExit();
    }
  }, [mapReady, is3DMode, apply3DExit]);

  useEffect(() => {
    if (!is3DMode || !mapReady || did3DInitialFocusRef.current) return;
    const timer = setTimeout(focus3DOnce, selfCoord ? 100 : 280);
    return () => clearTimeout(timer);
  }, [is3DMode, mapReady, selfCoord, selfHeading, focus3DOnce]);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  const handleRegionChangeStart = useCallback(() => {
    if (programmaticCameraRef.current) return;
    userGesturingRef.current = true;
  }, []);

  const handleRegionChangeComplete = useCallback(() => {
    if (programmaticCameraRef.current) return;
    userGesturingRef.current = false;
    gestureCooldownUntilRef.current = Date.now() + GESTURE_COOLDOWN_MS;
  }, []);

  const setFullscreen = useCallback(
    (next) => {
      if (isFullscreenControlled === undefined) {
        setInternalFullscreen(next);
      }
      onFullscreenChange?.(next);
    },
    [isFullscreenControlled, onFullscreenChange]
  );

  const openFullscreen = useCallback(() => {
    setFullscreen(true);
  }, [setFullscreen]);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
  }, [setFullscreen]);

  const toggle3DMode = useCallback(() => {
    setIs3DMode((prev) => !prev);
  }, []);

  const toggleRouteDisplay = useCallback(() => {
    setShowRoutes((prev) => !prev);
  }, []);

  const canShowRideRoute =
    bootstrapCoords.length >= 2 || plannedPath.length > 1;

  const showRideRouteView = useCallback(() => {
    setShowRoutes(true);
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const pathCoords =
      displayPlannedPath.length > 1
        ? validMapCoords(displayPlannedPath)
        : validMapCoords(bootstrapCoords);
    if (pathCoords.length === 0) return;

    try {
      if (map.fitToCoordinates) {
        map.fitToCoordinates(pathCoords, {
          edgePadding: { top: 56, right: 36, bottom: 72, left: 36 },
          animated: true,
        });
        return;
      }
      if (map.animateToRegion) {
        map.animateToRegion(regionForCoordinates(pathCoords), 400);
      }
    } catch {
      /* ignore map fit errors */
    }
  }, [bootstrapCoords, displayPlannedPath, mapReady]);

  useEffect(() => {
    if (defaultRideView) setShowRoutes(true);
  }, [defaultRideView]);

  useEffect(() => {
    if (!mapReady || !defaultRideView) return;
    const delay = routeFitNonce > 0 ? 80 : 360;
    const timer = setTimeout(showRideRouteView, delay);
    return () => clearTimeout(timer);
  }, [
    routeFitNonce,
    defaultRideView,
    mapReady,
    showRideRouteView,
    displayPlannedPath.length,
  ]);

  const statusMessage = gpsStatusText || null;

  const wrapStyle = [
    styles.wrap,
    fill && styles.wrapFill,
    isFullscreen && styles.wrapFullscreen,
    !fill && !isFullscreen && height != null && { height },
    style,
  ];

  const renderPlaceholder = (boxStyle) => {
    if (loadError) {
      return (
        <View style={[styles.placeholder, boxStyle]}>
          <Text style={styles.missingKeyTitle}>Maps unavailable</Text>
          <Text style={styles.missingKeyText}>{loadError}</Text>
        </View>
      );
    }
    if (!maps) {
      return (
        <View style={[styles.placeholder, boxStyle]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.placeholderText}>Loading map…</Text>
        </View>
      );
    }
    if (Platform.OS === "android" && !googleMapsKey) {
      return (
        <View style={[styles.placeholder, boxStyle]}>
          <Text style={styles.missingKeyTitle}>Google Maps API key required</Text>
          <Text style={styles.missingKeyText}>
            Add GOOGLE_MAPS_API_KEY to .env, then rebuild the app.
          </Text>
        </View>
      );
    }
    return null;
  };

  const placeholder = renderPlaceholder(
    fill ? [styles.wrapFill, style] : [{ height }, style]
  );
  if (placeholder) return placeholder;

  const boxStyle = fill
    ? [styles.wrapFill, style]
    : [{ height }, style];

  const { MapView, Marker, Polyline, PROVIDER_GOOGLE } = maps;
  const initialRegion = initialRegionRef.current || DEFAULT_MAP_CENTER;

  const renderStatusBanner = () =>
    statusMessage ? (
      <View style={styles.statusBanner} pointerEvents="none">
        <Icon name="information-circle" size={15} color={colors.warningText || colors.primary} />
        <Text style={styles.statusText} numberOfLines={1}>
          {statusMessage}
        </Text>
      </View>
    ) : null;

  const renderDriverControls = () =>
    driverControls ? (
      <View style={styles.driverControls} pointerEvents="box-none">
        <Pressable
          style={[styles.mapFab, is3DMode && styles.mapFabActive]}
          onPress={toggle3DMode}
          accessibilityLabel={is3DMode ? "Switch to 2D map" : "Switch to 3D map"}
          hitSlop={6}
        >
          <Icon
            name={is3DMode ? "cube" : "cube-outline"}
            size={22}
            color={is3DMode ? colors.primary : colors.text}
          />
        </Pressable>
        <Pressable
          style={[styles.mapFab, showRoutes && styles.mapFabActive]}
          onPress={toggleRouteDisplay}
          accessibilityLabel={showRoutes ? "Hide routes" : "Show routes"}
          hitSlop={6}
        >
          <Icon
            name={showRoutes ? "map" : "map-outline"}
            size={22}
            color={showRoutes ? colors.primary : colors.text}
          />
        </Pressable>
      </View>
    ) : null;

  const renderMapView = (mapStyle) => {
    const safePlannedPath = validMapCoords(plannedPath);
    const safePath = validMapCoords(path);
    const safeParticipantPath = validMapCoords(participantPath);
    const safeDriverLegPath = validMapCoords(driverLegPath);

    return (
    <MapView
      ref={mapRef}
      style={mapStyle}
      provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
      customMapStyle={isDark && useGoogleProvider ? DARK_GOOGLE_MAP_STYLE : undefined}
      userInterfaceStyle={isDark ? "dark" : "light"}
      initialRegion={initialRegion}
      onMapReady={handleMapReady}
      onRegionChangeStart={handleRegionChangeStart}
      onRegionChangeComplete={handleRegionChangeComplete}
      mapPadding={driverNavigationView ? NAV_MAP_PADDING : undefined}
      showsUserLocation={showNativeMyLocation}
      showsMyLocationButton={false}
      followsUserLocation={false}
      scrollEnabled
      zoomEnabled
      zoomTapEnabled
      scrollDuringRotateOrZoom
      pitchEnabled={is3DMode}
      rotateEnabled={is3DMode}
      {...(Platform.OS === "android" && showNativeMyLocation
        ? {
            userLocationPriority: "high",
            userLocationFastestInterval: 2000,
            userLocationUpdateInterval: 3000,
          }
        : {})}
      {...(Platform.OS === "ios" && showNativeMyLocation
        ? { userLocationUpdatePriority: "bestForNavigation" }
        : {})}
      showsBuildings={is3DMode}
      showsTraffic={is3DMode}
      loadingEnabled={false}
      moveOnMarkerPress={false}
      cacheEnabled={Platform.OS === "ios"}
    >
      {showPlannedRideRoute && validMapCoords(displayPlannedPath).length > 1 ? (
        <>
          <Polyline
            coordinates={validMapCoords(displayPlannedPath)}
            strokeColor={MAP_LINE_THEME.planned.outline}
            strokeWidth={MAP_LINE_THEME.planned.outlineWidth}
            geodesic
            lineCap="round"
            lineJoin="round"
          />
          <Polyline
            coordinates={validMapCoords(displayPlannedPath)}
            strokeColor={MAP_LINE_THEME.planned.stroke}
            strokeWidth={MAP_LINE_THEME.planned.width}
            geodesic
            lineCap="round"
            lineJoin="round"
          />
        </>
      ) : null}

      {showGpsTrail && safePath.length > 1 ? (
        <>
          <Polyline
            coordinates={safePath}
            strokeColor={MAP_LINE_THEME.liveGpsHalo.stroke}
            strokeWidth={MAP_LINE_THEME.liveGpsHalo.width}
            geodesic
            lineCap="round"
            lineJoin="round"
          />
          <Polyline
            coordinates={safePath}
            strokeColor={MAP_LINE_THEME.liveGps.stroke}
            strokeWidth={MAP_LINE_THEME.liveGps.width}
            geodesic
            lineCap="round"
            lineJoin="round"
          />
        </>
      ) : null}

      {showRoutes && !participantNavActive && safeParticipantPath.length > 1 ? (
        <Polyline
          coordinates={safeParticipantPath}
          strokeColor={MAP_LINE_THEME.participantJourney.stroke}
          strokeWidth={MAP_LINE_THEME.participantJourney.width}
          geodesic
          lineCap="round"
          lineJoin="round"
        />
      ) : null}

      {showDriverLegRoute && safeDriverLegPath.length > 1 ? (
        <>
          <Polyline
            coordinates={safeDriverLegPath}
            strokeColor={MAP_LINE_THEME.driverNavLeg.outline}
            strokeWidth={MAP_LINE_THEME.driverNavLeg.outlineWidth}
            geodesic
            lineCap="round"
            lineJoin="round"
          />
          <Polyline
            coordinates={safeDriverLegPath}
            strokeColor={MAP_LINE_THEME.driverNavLeg.stroke}
            strokeWidth={MAP_LINE_THEME.driverNavLeg.width}
            geodesic
            lineCap="round"
            lineJoin="round"
          />
        </>
      ) : null}

      {showRoutes && showDriverLegRoute &&
        participantMarkers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          title={m.title}
          description={m.description}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
          zIndex={6}
        >
          <RouteMapPin role={m.role} small />
        </Marker>
      ))}

      {showDriverArrow && selfCoord ? (
        <DriverNavMarker
          Marker={Marker}
          latitude={selfCoord.latitude}
          longitude={selfCoord.longitude}
          heading={driverMarkerHeading}
          title="You"
          description="Your location"
          size={driverNavigationView ? 62 : 58}
        />
      ) : null}

      {visibleMarkers.map((m) => {
        const isRoutePin =
          m.role === "route-from" ||
          m.role === "route-to" ||
          m.role === "stopover" ||
          m.role === "participant-pickup" ||
          m.role === "participant-drop";
        if (!showRoutes && isRoutePin) return null;

        const isLiveMarker = LIVE_MARKER_ROLES.has(m.role);
        const isDriverMarker = m.role === "driver";

        if (isLiveMarker && isDriverMarker) {
          return (
            <DriverNavMarker
              key={m.id}
              Marker={Marker}
              latitude={m.latitude}
              longitude={m.longitude}
              heading={remoteDriverHeading}
              title={m.title}
              description={m.description}
              size={52}
            />
          );
        }

        const markerChildren = isRoutePin ? (
          <RouteMapPin role={m.role} />
        ) : (
          <RideMapMarkerIcon role={m.role} isMe={m.isMe} />
        );
        const markerProps = {
          title: m.title,
          description: m.description,
          anchor: { x: 0.5, y: 1 },
          zIndex: m.isMe ? 10 : isRoutePin ? 3 : 4,
        };

        if (isLiveMarker) {
          return (
            <LiveMapMarker
              key={m.id}
              Marker={Marker}
              latitude={m.latitude}
              longitude={m.longitude}
              {...markerProps}
            >
              {markerChildren}
            </LiveMapMarker>
          );
        }

        return (
          <Marker
            key={m.id}
            coordinate={{
              latitude: m.latitude,
              longitude: m.longitude,
            }}
            tracksViewChanges={false}
            {...markerProps}
          >
            {markerChildren}
          </Marker>
        );
      })}
    </MapView>
    );
  };

  const renderRouteButton = () =>
    canShowRideRoute && mapReady && !loading ? (
      <Pressable
        style={[styles.mapFab, styles.routeFab, showRoutes && styles.mapFabActive]}
        onPress={showRideRouteView}
        accessibilityLabel="Show ride route from start to destination"
        hitSlop={6}
      >
        <Icon
          name={showRoutes ? "map" : "map-outline"}
          size={22}
          color={showRoutes ? colors.primary : colors.text}
        />
      </Pressable>
    ) : null;

  const renderMapChrome = ({ containerStyle, mapStyle, showExpand }) => (
    <View style={containerStyle}>
      {renderStatusBanner()}
      {renderMapView(mapStyle)}
      {!mapReady || loading ? (
        <View style={styles.mapBootOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
          {loadingText ? (
            <Text style={styles.placeholderText}>{loadingText}</Text>
          ) : null}
        </View>
      ) : null}
      {renderDriverControls()}
      {renderRouteButton()}
      {showExpand && allowFullscreen ? (
        <Pressable
          style={styles.fullscreenBtn}
          onPress={openFullscreen}
          accessibilityLabel="Open map fullscreen"
          hitSlop={8}
        >
          <Icon name="expand-outline" size={20} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={wrapStyle} collapsable={false}>
      {isFullscreen ? (
        <View style={styles.fullscreenHeader}>
          <Pressable
            onPress={closeFullscreen}
            style={styles.fullscreenHeaderBtn}
            hitSlop={10}
            accessibilityLabel="Exit fullscreen map"
          >
            <Icon name="chevron-down" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.fullscreenTitle} numberOfLines={1}>
            {fullscreenTitle}
          </Text>
          <View style={styles.fullscreenHeaderSpacer} />
        </View>
      ) : null}

      {renderMapChrome({
        containerStyle: styles.mapChromeWrap,
        mapStyle: styles.map,
        showExpand: !isFullscreen && allowFullscreen,
      })}
    </View>
  );
};

export default GoogleRideMap;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    wrapFill: {
      flex: 1,
      minHeight: 220,
      borderRadius: 16,
    },
    wrapFullscreen: {
      flex: 1,
      borderRadius: 0,
      minHeight: undefined,
    },
    map: { flex: 1 },
    mapChromeWrap: {
      flex: 1,
      minHeight: 180,
    },
    fullscreenHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 4,
      paddingBottom: 6,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      zIndex: 30,
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
      color: c.text,
      textAlign: "center",
    },
    fullscreenHeaderSpacer: {
      width: 40,
    },
    placeholder: {
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    placeholderText: {
      marginTop: 8,
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
    },
    dataLoader: {
      flex: 1,
      minHeight: 180,
    },
    mapBootOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.06)",
      zIndex: 20,
    },
    missingKeyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      marginBottom: 8,
      textAlign: "center",
    },
    missingKeyText: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
    statusBanner: {
      position: "absolute",
      top: 10,
      left: 10,
      right: 10,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    statusText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: "600",
    },
    driverControls: {
      position: "absolute",
      top: 10,
      right: 10,
      zIndex: 24,
      gap: 8,
    },
    mapFab: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 6,
      elevation: 5,
    },
    mapFabActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryMuted || c.surface,
    },
    routeFab: {
      position: "absolute",
      bottom: 12,
      left: 12,
      zIndex: 25,
    },
    fullscreenBtn: {
      position: "absolute",
      bottom: 12,
      right: 12,
      zIndex: 25,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 6,
      elevation: 5,
    },
  });
