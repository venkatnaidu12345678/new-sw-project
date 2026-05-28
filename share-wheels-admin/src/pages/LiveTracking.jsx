import { useEffect, useState, useMemo, useCallback } from "react";
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

const roleIcon = (role) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:17px;border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      background:${role === "driver" ? "#2563eb" : role === "courier" ? "#d97706" : "#16a34a"};
    ">${role === "driver" ? "??" : role === "courier" ? "??" : "??"}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const DEFAULT_CENTER = [17.385, 78.4867];

const normalizeLocation = (loc) => {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, updatedAt: loc.updatedAt };
};

const rideKey = (id) => (id == null ? "" : String(id));

const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
};

const collectMarkers = (ride, detail) => {
  const markers = [];
  const lt = detail?.liveTracking || ride?.liveTracking;
  const driverLoc =
    normalizeLocation(detail?.location) ||
    normalizeLocation(lt?.driverLocation) ||
    normalizeLocation(ride?.location);

  if (driverLoc) {
    markers.push({
      key: `${ride.rideId}-driver`,
      ...driverLoc,
      role: "driver",
      label: ride.driver?.name || "Driver",
    });
  }

  const participants =
    detail?.participants ||
    detail?.liveTracking?.participantLocations ||
    ride?.participants ||
    [];

  participants.forEach((p, i) => {
    const loc = normalizeLocation(p.location || p);
    if (!loc) return;
    if (p.role === "driver" && driverLoc) return;
    markers.push({
      key: `${ride.rideId}-${p.userId || i}-${p.role}`,
      ...loc,
      role: p.role || "passenger",
      label: p.name || p.role,
    });
  });

  return markers;
};

export default function LiveTracking() {
  const [rides, setRides] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getActiveTracking();
      const list = (res.rides || []).map((r) => ({
        ...r,
        rideId: rideKey(r.rideId),
        location: normalizeLocation(r.location),
      }));
      setRides(list);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    getTrackingDetail(selectedId)
      .then((res) => {
        const ride = res.ride || {};
        setDetail({
          ...ride,
          location: normalizeLocation(ride.location || ride.liveTracking?.driverLocation),
        });
      })
      .catch(() => setDetail(null));
  }, [selectedId]);

  const selectedRide = useMemo(
    () => rides.find((r) => rideKey(r.rideId) === rideKey(selectedId)),
    [rides, selectedId]
  );

  const filteredRides = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rides;
    return rides.filter((r) => {
      const hay = `${r.from || ""} ${r.to || ""} ${r.driver?.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rides, search]);

  const pathPositions = useMemo(() => {
    const path = detail?.liveTracking?.locationHistory || selectedRide?.path || [];
    return path
      .map((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);
  }, [detail, selectedRide]);

  const allMarkers = useMemo(() => {
    if (selectedRide) {
      return collectMarkers(selectedRide, detail);
    }
    return rides.flatMap((r) => collectMarkers(r, null));
  }, [rides, selectedRide, detail]);

  const mapCenter = useMemo(() => {
    if (allMarkers.length) return [allMarkers[0].lat, allMarkers[0].lng];
    if (pathPositions.length) return pathPositions[pathPositions.length - 1];
    return DEFAULT_CENTER;
  }, [allMarkers, pathPositions]);

  const fitPoints = useMemo(
    () => allMarkers.map((m) => [m.lat, m.lng]),
    [allMarkers]
  );

  return (
    <div>
      <h1 style={styles.heading}>Live Ride Tracking</h1>
      <p style={styles.sub}>
        Driver, passenger, and courier locations when a ride is started and GPS is shared.
      </p>
      <div style={styles.legend}>
        <span>?? Driver</span>
        <span>?? Passenger</span>
        <span>?? Courier</span>
      </div>
      {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <h3 style={styles.sideTitle}>Active rides ({filteredRides.length})</h3>

          <div className="toolbar" style={{ marginBottom: 12 }}>
            <input
              placeholder="Search route or driver�"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                alert("Create is not available for live tracking yet.")
              }
            >
              Create
            </button>
          </div>

          {loading && rides.length === 0 ? (
            <p>Loading...</p>
          ) : filteredRides.length === 0 ? (
            <p style={styles.muted}>No active rides match your search.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Driver</th>
                    <th>GPS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRides.map((r) => {
                    const active = rideKey(selectedId) === rideKey(r.rideId);
                    return (
                      <tr
                        key={r.rideId}
                        style={{
                          cursor: "pointer",
                          background: active ? "#EFF6FF" : "transparent",
                        }}
                        onClick={() => setSelectedId(r.rideId)}
                      >
                        <td>{r.from} ? {r.to}</td>
                        <td>{r.driver?.name || "�"}</td>
                        <td style={{ fontWeight: 800, color: r.location ? "#16a34a" : "#d97706" }}>
                          {r.location
                            ? `(${r.location.lat.toFixed(2)}, ${r.location.lng.toFixed(2)})`
                            : "Waiting"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            <FitBounds points={fitPoints} />

            {allMarkers.map((m) => (
              <Marker
                key={m.key}
                position={[m.lat, m.lng]}
                icon={roleIcon(m.role)}
              >
                <Popup>
                  <strong>{m.label}</strong>
                  <br />
                  {m.role}
                </Popup>
              </Marker>
            ))}

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
  sub: { color: "#64748b", marginBottom: 12 },
  legend: {
    display: "flex",
    gap: 20,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 600,
    color: "#334155",
  },
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
