import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { DARK_GOOGLE_MAP_STYLE } from "../../theme/mapStyles";

const googleMapsKey = (Config.GOOGLE_MAPS_API_KEY || "").trim();

const MAP_EDGE_PADDING = { top: 56, right: 56, bottom: 80, left: 56 };
const MAP_EDGE_PADDING_FULL = { top: 72, right: 48, bottom: 120, left: 48 };

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
  autoFocus = true,
  showMyLocation = false,
  gpsStatusText,
  allowFullscreen = true,
  fullscreenTitle = "Live map",
}) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { maps, loadError } = useMapsModule();
  const { isDark, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const useGoogleProvider =
    Platform.OS === "android" || (Platform.OS === "ios" && !!googleMapsKey);

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

  /** Refit camera when participants join/leave — not on every GPS tick. */
  const fitTriggerKey = useMemo(
    () => markers.map((m) => m.id).sort().join(","),
    [markers]
  );

  const lastFitTriggerRef = useRef("");
  const mapThemeKey = isDark ? "dark" : "light";

  useEffect(() => {
    lastFitTriggerRef.current = "";
  }, [isFullscreen]);

  const fitMapToContent = useCallback(
    (edgePadding = MAP_EDGE_PADDING) => {
      const map = mapRef.current;
      if (!map || focusCoordinates.length === 0) return;

      if (focusCoordinates.length === 1) {
        map.animateToRegion(regionForCoordinates(focusCoordinates), 400);
        return;
      }

      try {
        map.fitToCoordinates(focusCoordinates, {
          edgePadding,
          animated: true,
        });
      } catch {
        map.animateToRegion(regionForCoordinates(focusCoordinates), 400);
      }
    },
    [focusCoordinates]
  );

  useEffect(() => {
    if (!autoFocus || !mapReady || !maps || markers.length === 0) return;
    if (lastFitTriggerRef.current === fitTriggerKey) return;
    lastFitTriggerRef.current = fitTriggerKey;
    const padding = isFullscreen ? MAP_EDGE_PADDING_FULL : MAP_EDGE_PADDING;
    const t = setTimeout(() => fitMapToContent(padding), 150);
    return () => clearTimeout(t);
  }, [
    autoFocus,
    mapReady,
    maps,
    fitTriggerKey,
    fitMapToContent,
    isFullscreen,
    markers.length,
  ]);

  useEffect(() => {
    if (!isFullscreen || !mapReady || !maps || markers.length === 0) return;
    const t = setTimeout(() => fitMapToContent(MAP_EDGE_PADDING_FULL), 200);
    return () => clearTimeout(t);
  }, [isFullscreen, mapReady, maps, fitMapToContent, markers.length]);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const statusMessage =
    gpsStatusText ||
    (!hasRemoteMarkers ? "Map ready · waiting for ride GPS signals…" : null);

  const wrapStyle = [
    styles.wrap,
    fill && styles.wrapFill,
    !fill && height != null && { height },
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

  const { MapView, Marker, Polyline, PROVIDER_GOOGLE } = maps;
  const initialRegion =
    focusCoordinates.length > 0
      ? regionForCoordinates(focusCoordinates)
      : DEFAULT_MAP_CENTER;

  const renderStatusBanner = (reserveExpandSpace = false) =>
    statusMessage ? (
      <View
        style={[
          styles.statusBanner,
          reserveExpandSpace && styles.statusBannerWithExpand,
        ]}
        pointerEvents="none"
      >
        {!hasRemoteMarkers ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.statusSpinner}
          />
        ) : (
          <View style={styles.livePulse} />
        )}
        <Text style={styles.statusText} numberOfLines={2}>
          {statusMessage}
        </Text>
      </View>
    ) : null;

  const renderLegend = () => (
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
  );

  const renderMapView = (mapStyle) => (
    <MapView
      key={`ride-map-${mapThemeKey}`}
      ref={mapRef}
      style={mapStyle}
      provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
      customMapStyle={isDark && useGoogleProvider ? DARK_GOOGLE_MAP_STYLE : undefined}
      userInterfaceStyle={isDark ? "dark" : "light"}
      initialRegion={initialRegion}
      onMapReady={handleMapReady}
      showsUserLocation={showMyLocation}
      showsMyLocationButton={showMyLocation}
      loadingEnabled={false}
      moveOnMarkerPress={false}
    >
      {path.length > 1 ? (
        <Polyline coordinates={path} strokeColor={colors.primary} strokeWidth={4} />
      ) : null}

      {markers.map((m) => (
        <Marker
          key={m.id}
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
  );

  const renderMapChrome = ({ containerStyle, mapStyle, showExpand }) => (
    <View style={containerStyle}>
      {renderStatusBanner(showExpand)}
      {renderMapView(mapStyle)}
      {renderLegend()}
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
    <>
      {!isFullscreen
        ? renderMapChrome({
            containerStyle: wrapStyle,
            mapStyle: styles.map,
            showExpand: true,
          })
        : null}

      <Modal
        visible={isFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={closeFullscreen}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <View
          style={[
            styles.fullscreenRoot,
            { backgroundColor: colors.background, paddingTop: insets.top },
          ]}
        >
          <View style={[styles.fullscreenHeader, { paddingBottom: 8 }]}>
            <Pressable
              onPress={closeFullscreen}
              style={styles.fullscreenHeaderBtn}
              hitSlop={10}
            >
              <Icon name="chevron-down" size={26} color={colors.text} />
            </Pressable>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              {fullscreenTitle}
            </Text>
            <View style={styles.fullscreenHeaderSpacer} />
          </View>

          {renderMapChrome({
            containerStyle: styles.fullscreenMapWrap,
            mapStyle: styles.fullscreenMap,
            showExpand: false,
          })}
        </View>
      </Modal>
    </>
  );
};

export default GoogleRideMap;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    wrapFill: {
      flex: 1,
      minHeight: 220,
      borderRadius: 12,
    },
    map: { flex: 1 },
    fullscreenRoot: {
      flex: 1,
    },
    fullscreenHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
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
    fullscreenMapWrap: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    fullscreenMap: {
      flex: 1,
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
      top: 8,
      left: 8,
      right: 8,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    statusSpinner: { marginRight: 8 },
    livePulse: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.successText,
      marginRight: 8,
    },
    statusText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: "600",
    },
    statusBannerWithExpand: {
      right: 52,
    },
    legendBar: {
      position: "absolute",
      bottom: 8,
      left: 8,
      right: 8,
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderWidth: 1,
      borderColor: c.border,
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
      borderColor: c.border,
    },
    legendLabel: { fontSize: 11, color: c.textSecondary, fontWeight: "600" },
    fullscreenBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 25,
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
  });
