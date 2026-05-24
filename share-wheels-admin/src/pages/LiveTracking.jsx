import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getActiveTracking, getTrackingDetail } from "../api/client";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const driverIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER = [17.385, 78.4867];

const FitBounds = ({ rides }) => {
  const map = useMap();
  useEffect(() => {
    const points = rides
      .filter((r) => r.location?.lat != null)
      .map((r) => [r.location.lat, r.location.lng]);
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [rides, map]);
  return null;
};

export default function LiveTracking() {
  const [rides, setRides] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await getActiveTracking();
      setRides(res.rides || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    getTrackingDetail(selectedId)
      .then((res) => setDetail(res.ride))
      .catch(() => setDetail(null));
  }, [selectedId]);

  const selectedRide = useMemo(
    () => rides.find((r) => r.rideId === selectedId),
    [rides, selectedId]
  );

  const pathPositions = useMemo(() => {
    const path = detail?.liveTracking?.locationHistory || selectedRide?.path || [];
    return path.map((p) => [p.lat, p.lng]).filter((p) => p[0] && p[1]);
  }, [detail, selectedRide]);

  const mapCenter = useMemo(() => {
    const loc = detail?.liveTracking?.driverLocation || selectedRide?.location;
    if (loc?.lat) return [loc.lat, loc.lng];
    if (pathPositions.length) return pathPositions[pathPositions.length - 1];
    return DEFAULT_CENTER;
  }, [detail, selectedRide, pathPositions]);

  return (
    <div>
      <h1 style={styles.heading}>Live Ride Tracking</h1>
      <p style={styles.sub}>
        Active rides appear when a driver starts a ride and shares GPS location.
      </p>
      {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <h3 style={styles.sideTitle}>Active rides ({rides.length})</h3>
          {loading && rides.length === 0 ? (
            <p>Loading…</p>
          ) : rides.length === 0 ? (
            <p style={styles.muted}>No rides in progress with location yet.</p>
          ) : (
            rides.map((r) => (
              <button
                key={r.rideId}
                type="button"
                style={{
                  ...styles.rideCard,
                  ...(selectedId === r.rideId ? styles.rideCardActive : {}),
                }}
                onClick={() => setSelectedId(r.rideId)}
              >
                <div style={styles.rideRoute}>
                  {r.from} → {r.to}
                </div>
                <div style={styles.rideMeta}>
                  Driver: {r.driver?.name || "—"} · {r.passengerCount} passenger(s)
                </div>
                {r.location?.lat ? (
                  <div style={styles.gpsOk}>GPS live</div>
                ) : (
                  <div style={styles.gpsWait}>Waiting for GPS…</div>
                )}
              </button>
            ))
          )}
        </div>

        <div style={styles.mapWrap}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%", borderRadius: 12 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds rides={rides} />

            {rides.map((r) =>
              r.location?.lat ? (
                <Marker
                  key={r.rideId}
                  position={[r.location.lat, r.location.lng]}
                  icon={driverIcon}
                  eventHandlers={{
                    click: () => setSelectedId(r.rideId),
                  }}
                >
                  <Popup>
                    <strong>{r.from} → {r.to}</strong>
                    <br />
                    Driver: {r.driver?.name}
                  </Popup>
                </Marker>
              ) : null
            )}

            {pathPositions.length > 1 && (
              <Polyline positions={pathPositions} color="#2563eb" weight={4} />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

const styles = {
  heading: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  sub: { color: "#64748b", marginBottom: 20 },
  layout: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 20,
    minHeight: 520,
  },
  sidebar: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    maxHeight: 560,
    overflowY: "auto",
  },
  sideTitle: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  muted: { color: "#94a3b8", fontSize: 14 },
  rideCard: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    cursor: "pointer",
  },
  rideCardActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
  },
  rideRoute: { fontWeight: 600, fontSize: 14, marginBottom: 4 },
  rideMeta: { fontSize: 12, color: "#64748b" },
  gpsOk: { fontSize: 11, color: "#16a34a", marginTop: 6, fontWeight: 600 },
  gpsWait: { fontSize: 11, color: "#d97706", marginTop: 6 },
  mapWrap: {
    height: 560,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
};
