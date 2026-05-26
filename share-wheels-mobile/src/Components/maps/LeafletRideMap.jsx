import React, { useMemo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

const DEFAULT_CENTER = [17.385, 78.4867];

const toPoint = (loc) => {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: loc.name || loc.label || "" };
};

const buildHtml = (markers, path, center) => {
  const markersJson = JSON.stringify(markers);
  const pathJson = JSON.stringify(path);
  const centerJson = JSON.stringify(center);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; }
    .role-icon {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    .driver { background: #2563eb; }
    .passenger { background: #16a34a; }
    .courier { background: #d97706; }
    .me { outline: 3px solid #fbbf24; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const markers = ${markersJson};
    const path = ${pathJson};
    const center = ${centerJson};
    const map = L.map('map', { zoomControl: true }).setView(center, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const emoji = { driver: '🚗', passenger: '👤', courier: '📦' };
    const layers = [];

    markers.forEach((m) => {
      const cls = 'role-icon ' + (m.role || 'passenger') + (m.isMe ? ' me' : '');
      const icon = L.divIcon({
        html: '<div class="' + cls + '">' + (emoji[m.role] || '📍') + '</div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      if (m.label) marker.bindPopup(m.label);
      layers.push(marker);
    });

    if (path.length > 1) {
      L.polyline(path, { color: '#2563eb', weight: 4 }).addTo(map);
    }

    if (layers.length) {
      const group = L.featureGroup(layers);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  </script>
</body>
</html>`;
};

/**
 * Leaflet map in WebView — shows driver, passengers, couriers on active ride.
 */
const LeafletRideMap = ({ tracking, myRole, style, height = 280 }) => {
  const { html, loading } = useMemo(() => {
    const lt = tracking?.liveTracking || tracking || {};
    const participants = lt.participantLocations || [];
    const driverLoc = toPoint(lt.driverLocation);
    const myId = tracking?.myUserId?.toString?.();

    const markers = [];
    if (driverLoc) {
      markers.push({
        ...driverLoc,
        role: "driver",
        label: "Driver",
        isMe: myRole === "driver",
      });
    }

    participants.forEach((p) => {
      const pt = toPoint(p);
      if (!pt) return;
      const uid = p.userId?.toString?.() || String(p.userId);
      if (p.role === "driver" && driverLoc) return;
      markers.push({
        ...pt,
        role: p.role || "passenger",
        label: p.name || p.role,
        isMe: uid === myId,
      });
    });

    const path = (lt.locationHistory || [])
      .map((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
      })
      .filter(Boolean);

    const first = markers[0];
    const center = first ? [first.lat, first.lng] : DEFAULT_CENTER;

    return {
      html: buildHtml(markers, path, center),
      loading: !markers.length && !path.length,
    };
  }, [tracking, myRole]);

  if (!tracking) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : null}
    </View>
  );
};

export default LeafletRideMap;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  webview: { flex: 1 },
  placeholder: {
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
});
