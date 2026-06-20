import { useEffect, useState, useMemo } from "react";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import SearchInput from "../components/ui/SearchInput";
import AdminPageShell from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import GoogleTrackingMap from "../components/maps/GoogleTrackingMap";
import { usePlannedRoutePath } from "../hooks/usePlannedRoutePath";
import { usePagination } from "../hooks/usePagination";
import {
  useAdminLiveTracking,
  normalizeTrackingLocation,
} from "../hooks/useAdminLiveTracking";
import { Alert, btnClass, Table, Th, Td } from "../components/ui/primitives";

const rideKey = (id) => (id == null ? "" : String(id));

const collectMarkers = (ride, routeEndpoints = {}) => {
  const markers = [];
  const driverLoc = normalizeTrackingLocation(ride?.location);

  if (driverLoc) {
    markers.push({
      key: `${ride.rideId}-driver`,
      ...driverLoc,
      role: "driver",
      label: ride.driver?.name || "Driver",
    });
  }

  const participants = ride?.participants || [];
  participants.forEach((p, i) => {
    const loc = normalizeTrackingLocation(p.location || p);
    if (!loc) return;
    if (p.role === "driver" && driverLoc) return;
    markers.push({
      key: `${ride.rideId}-${p.userId || i}-${p.role}`,
      ...loc,
      role: p.role || "passenger",
      label: p.name || p.role,
    });
  });

  const rideId = ride?.rideId || "ride";
  if (routeEndpoints.from) {
    markers.push({
      key: `${rideId}-route-from`,
      lat: routeEndpoints.from.lat,
      lng: routeEndpoints.from.lng,
      role: "route-from",
      label: routeEndpoints.from.label || "Pickup",
    });
  }
  if (routeEndpoints.to) {
    markers.push({
      key: `${rideId}-route-to`,
      lat: routeEndpoints.to.lat,
      lng: routeEndpoints.to.lng,
      role: "route-to",
      label: routeEndpoints.to.label || "Destination",
    });
  }

  const stopovers = ride?.stopovers || [];
  stopovers.forEach((stop, index) => {
    const lat = Number(stop?.lat ?? stop?.latitude);
    const lng = Number(stop?.lng ?? stop?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    markers.push({
      key: `${rideId}-stopover-${index}`,
      lat,
      lng,
      role: "stopover",
      label: stop?.label || `Stop ${index + 1}`,
    });
  });

  return markers;
};

export default function LiveTracking() {
  const { rides, loading, error, socketConnected, refresh } = useAdminLiveTracking();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedId && rides.length > 0) {
      setSelectedId(rides[0].rideId);
    }
  }, [rides, selectedId]);

  useEffect(() => {
    if (selectedId && !rides.some((r) => rideKey(r.rideId) === rideKey(selectedId))) {
      setSelectedId(rides[0]?.rideId || null);
    }
  }, [rides, selectedId]);

  const selectedRide = useMemo(
    () => rides.find((r) => rideKey(r.rideId) === rideKey(selectedId)),
    [rides, selectedId]
  );

  const savedPolyline = selectedRide?.routePolyline || "";
  const routeStopovers = selectedRide?.stopovers || [];

  const { plannedPath, endpoints: routeEndpoints, loading: routeLoading, error: routeError } =
    usePlannedRoutePath({
      fromCoords: selectedRide?.fromCoords || null,
      toCoords: selectedRide?.toCoords || null,
      fromLabel: selectedRide?.from || "",
      toLabel: selectedRide?.to || "",
      savedPolyline,
      stopovers: routeStopovers,
      enabled: !!selectedRide,
    });

  const filteredRides = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rides;
    return rides.filter((r) => {
      const hay = `${r.from || ""} ${r.to || ""} ${r.driver?.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rides, search]);

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(
    filteredRides,
    {
      pageSize: 6,
      resetDeps: [search],
    }
  );

  const gpsPath = useMemo(() => {
    const path = selectedRide?.path || [];
    return path
      .map((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      })
      .filter(Boolean);
  }, [selectedRide]);

  const allMarkers = useMemo(() => {
    if (selectedRide) {
      return collectMarkers(selectedRide, routeEndpoints);
    }
    return rides.flatMap((r) => collectMarkers(r));
  }, [rides, selectedRide, routeEndpoints]);

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Live ride tracking"
        subtitle="Live GPS every 3s — WebSocket + API, smooth map updates"
      />
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${
            socketConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${socketConnected ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          {socketConnected ? "Live socket connected" : "Connecting…"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1D4ED8] ring-2 ring-white" /> Driver
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#059669] ring-2 ring-white" /> Passenger
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C] ring-2 ring-white" /> Courier
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] ring-2 ring-white" /> Start
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E11D48] ring-2 ring-white" /> End
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-6 rounded bg-indigo-400/90" /> Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-6 rounded bg-sky-500" /> Live GPS
        </span>
      </div>
      {error ? <Alert className="mb-2 shrink-0">{error}</Alert> : null}
      {routeError && selectedRide ? (
        <Alert className="mb-2 shrink-0">Route: {routeError}</Alert>
      ) : null}
      {routeLoading && selectedRide && !savedPolyline ? (
        <p className="mb-2 shrink-0 text-xs font-medium text-slate-500">Loading route directions…</p>
      ) : null}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <h3 className="mb-2 shrink-0 text-sm font-bold text-slate-800">
            Active rides ({totalItems})
          </h3>
          <div className="mb-2 flex shrink-0 flex-wrap gap-2">
            <SearchInput
              className="max-w-[220px]"
              placeholder="Search route or driver"
              onDebouncedChange={setSearch}
            />
            <button type="button" className={btnClass("secondary", "sm")} onClick={refresh}>
              Refresh
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            {loading && rides.length === 0 ? (
              <Loading message="Connecting to live tracking…" className="flex-1 py-6" />
            ) : totalItems === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No active rides match your search.</p>
            ) : (
              <>
                <Table fill>
                  <thead>
                    <tr>
                      <Th sticky>Route</Th>
                      <Th sticky>Driver</Th>
                      <Th sticky>GPS</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedItems.map((r) => {
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
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
          <GoogleTrackingMap
            markers={allMarkers}
            plannedPath={plannedPath}
            gpsPath={gpsPath}
            fitSessionKey={selectedId || ""}
            loading={loading && rides.length === 0}
            loadingMessage="Loading live map…"
          />
        </div>
      </div>
    </AdminPageShell>
  );
}
