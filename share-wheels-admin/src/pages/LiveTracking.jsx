import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getActiveTracking, getTrackingDetail } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import { Alert, btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";
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
    ">${role === "driver" ? "D" : role === "courier" ? "C" : "P"}</div>`,
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
    <div className="mx-auto flex h-full max-w-[1600px] flex-col">
      <PageHeader
        title="Live ride tracking"
        subtitle="Driver, passenger, and courier GPS when a ride is started"
      />
      <div className="mb-4 flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-brand-600 ring-2 ring-white" /> Driver
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-white" /> Passenger
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-600 ring-2 ring-white" /> Courier
        </span>
      </div>
      {error ? <Alert className="mb-4">{error}</Alert> : null}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div className="flex max-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:max-h-none">
          <h3 className="mb-3 shrink-0 text-sm font-bold text-slate-800">
            Active rides ({filteredRides.length})
          </h3>
          <div className="mb-3 flex shrink-0 flex-wrap gap-2">
            <input
              className={inputClass("max-w-[220px]")}
              placeholder="Search route or driver"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
              Refresh
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {loading && rides.length === 0 ? (
              <Loading message="Loading active rides..." />
            ) : filteredRides.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No active rides match your search.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Route</Th>
                    <Th>Driver</Th>
                    <Th>GPS</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRides.map((r) => {
                    const active = rideKey(selectedId) === rideKey(r.rideId);
                    return (
                      <tr
                        key={r.rideId}
                        className={`cursor-pointer transition ${active ? "bg-brand-50" : "hover:bg-slate-50/80"}`}
                        onClick={() => setSelectedId(r.rideId)}
                      >
                        <Td className="font-medium text-slate-800">
                          {r.from} → {r.to}
                        </Td>
                        <Td>{r.driver?.name || "—"}</Td>
                        <Td className={`text-xs font-bold ${r.location ? "text-emerald-600" : "text-amber-600"}`}>
                          {r.location
                            ? `(${r.location.lat.toFixed(2)}, ${r.location.lng.toFixed(2)})`
                            : "Waiting"}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        </div>
        <div className="min-h-[420px] overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm lg:min-h-[560px]">
          <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={fitPoints} />
            {allMarkers.map((m) => (
              <Marker key={m.key} position={[m.lat, m.lng]} icon={roleIcon(m.role)}>
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
