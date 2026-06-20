import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import {
  ADMIN_LINE_THEME,
  ADMIN_MAP_THEME,
  buildRoleMarkerIcon,
} from "./mapMarkerIcons";
import SmoothTrackingMarker from "./SmoothTrackingMarker";

const LIVE_ROLES = new Set(["driver", "passenger", "courier"]);
const ROUTE_ROLES = new Set(["route-from", "route-to", "stopover"]);

const fitMapToPoints = (map, points = []) => {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
  );
  if (!map || !valid.length) return;

  if (valid.length === 1) {
    map.setCenter(valid[0]);
    map.setZoom(14);
    return;
  }

  const bounds = new window.google.maps.LatLngBounds();
  valid.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds, 48);
};

const MAP_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 };
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

const GcpSetupHelp = () => (
  <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-5 text-left text-sm text-amber-950">
    <p className="font-bold">Google Maps blocked (ApiTargetBlockedMapError)</p>
    <p className="mt-2 text-xs text-amber-900">
      The admin panel needs a <strong>browser</strong> API key with Maps JavaScript API enabled.
      Android-only keys cannot load maps in the browser.
    </p>
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-amber-900">
      <li>
        Enable <strong>Maps JavaScript API</strong> in Google Cloud Console → APIs &amp; Services →
        Library.
      </li>
      <li>
        Credentials → your key → <strong>API restrictions</strong> → add Maps JavaScript API,
        Routes API, Places API.
      </li>
      <li>
        <strong>Application restrictions</strong> → HTTP referrers → add:
        <code className="mt-1 block rounded bg-amber-100 px-2 py-1">http://localhost:5173/*</code>
        <code className="mt-1 block rounded bg-amber-100 px-2 py-1">http://127.0.0.1:5173/*</code>
      </li>
      <li>
        Put that browser key in <code className="rounded bg-amber-100 px-1">share-wheels-admin/.env</code>{" "}
        as <code className="rounded bg-amber-100 px-1">VITE_GOOGLE_MAPS_API_KEY</code>, restart{" "}
        <code className="rounded bg-amber-100 px-1">npm run dev</code>, then hard-refresh.
      </li>
    </ol>
  </div>
);

const MapLegend = () => (
  <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[min(100%,320px)] rounded-xl border border-white/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Map legend</p>
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-semibold text-slate-700">
      {Object.entries(ADMIN_MAP_THEME).map(([role, meta]) => (
        <span key={role} className="inline-flex items-center gap-1">
          <span
            className="h-3 w-3 rounded-full ring-2 ring-white"
            style={{ backgroundColor: meta.color }}
          />
          {role === "route-from"
            ? "Start"
            : role === "route-to"
              ? "End"
              : role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="h-1 w-5 rounded-full" style={{ backgroundColor: ADMIN_LINE_THEME.planned.color }} />
        Planned
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: ADMIN_LINE_THEME.gps.color }} />
        Live GPS
      </span>
    </div>
  </div>
);

function FitBoundsHandler({ markers, map, fitSessionKey }) {
  const fittedSessionRef = useRef(null);

  useEffect(() => {
    if (!map || !fitSessionKey) return;
    if (fittedSessionRef.current === fitSessionKey) return;

    const livePoints = markers
      .filter((m) => LIVE_ROLES.has(m.role))
      .map((m) => ({ lat: m.lat, lng: m.lng }));

    if (!livePoints.length) return;

    fittedSessionRef.current = fitSessionKey;
    fitMapToPoints(map, livePoints);
  }, [map, fitSessionKey, markers]);

  return null;
}

function RouteFitHandler({ map, markers, plannedPath, routeFitKey, showRideRoute }) {
  useEffect(() => {
    if (!map || !routeFitKey || !showRideRoute) return;

    const routePoints = [
      ...(plannedPath.length > 1 ? plannedPath : []),
      ...markers
        .filter((m) => ROUTE_ROLES.has(m.role))
        .map((m) => ({ lat: m.lat, lng: m.lng })),
    ];

    fitMapToPoints(map, routePoints);
  }, [map, routeFitKey, markers, plannedPath, showRideRoute]);

  return null;
}

const RouteFabIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
    />
    <path
      fill="currentColor"
      d="M4 20.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5v-1H4v1z"
      opacity="0.35"
    />
  </svg>
);

export default function GoogleTrackingMap({
  markers = [],
  plannedPath = [],
  gpsPath = [],
  fitSessionKey = "",
  loading = false,
  loadingMessage = "Loading map…",
}) {
  const [map, setMap] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [showRideRoute, setShowRideRoute] = useState(false);
  const [routeFitKey, setRouteFitKey] = useState(0);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAP_API_KEY,
    id: "share-wheels-admin-maps",
  });

  useEffect(() => {
    if (!MAP_API_KEY) return undefined;
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => setAuthBlocked(true);
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);

  useEffect(() => {
    if (!fitSessionKey) {
      setShowRideRoute(false);
      setRouteFitKey(0);
      return;
    }
    setShowRideRoute(true);
    setRouteFitKey((key) => key + 1);
  }, [fitSessionKey]);

  const hasRideRoute =
    plannedPath.length > 1 ||
    markers.some((m) => ROUTE_ROLES.has(m.role));

  const visibleMarkers = showRideRoute
    ? markers
    : markers.filter((m) => LIVE_ROLES.has(m.role));

  const visiblePlannedPath = showRideRoute ? plannedPath : [];

  const handleShowRideRoute = () => {
    setShowRideRoute(true);
    setRouteFitKey((key) => key + 1);
  };

  if (!MAP_API_KEY) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center text-sm text-slate-600">
          Set <code className="rounded bg-slate-200 px-1">VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code className="rounded bg-slate-200 px-1">share-wheels-admin/.env</code> (browser key
          with Maps JavaScript API), then restart the dev server.
        </div>
      </div>
    );
  }

  if (authBlocked || loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6">
        <GcpSetupHelp />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative flex h-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
          <span>{loadingMessage}</span>
        </div>
      </div>
    );
  }

  const handleMapLoad = (instance) => {
    setMap(instance);
    setMapReady(true);
  };

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={13}
        onLoad={handleMapLoad}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        }}
      >
        <FitBoundsHandler markers={markers} map={map} fitSessionKey={fitSessionKey} />
        <RouteFitHandler
          map={map}
          markers={markers}
          plannedPath={plannedPath}
          routeFitKey={routeFitKey}
          showRideRoute={showRideRoute}
        />
        {visibleMarkers.map((m) => {
          const icon = buildRoleMarkerIcon(m.role, window.google);
          const title = `${m.label} (${m.role})`;
          const zIndex =
            m.role === "driver"
              ? 50
              : m.role === "route-from" || m.role === "route-to"
                ? 30
                : 40;

          if (LIVE_ROLES.has(m.role)) {
            return (
              <SmoothTrackingMarker
                key={m.key}
                lat={m.lat}
                lng={m.lng}
                icon={icon}
                title={title}
                zIndex={zIndex}
              />
            );
          }

          return (
            <Marker
              key={m.key}
              position={{ lat: m.lat, lng: m.lng }}
              icon={icon}
              title={title}
              zIndex={zIndex}
            />
          );
        })}
        {visiblePlannedPath.length > 1 ? (
          <>
            <Polyline
              path={visiblePlannedPath}
              options={{
                strokeColor: ADMIN_LINE_THEME.plannedOutline.color,
                strokeWeight: ADMIN_LINE_THEME.plannedOutline.weight,
                strokeOpacity: ADMIN_LINE_THEME.plannedOutline.opacity,
                geodesic: true,
              }}
            />
            <Polyline
              path={visiblePlannedPath}
              options={{
                strokeColor: ADMIN_LINE_THEME.planned.color,
                strokeWeight: ADMIN_LINE_THEME.planned.weight,
                strokeOpacity: ADMIN_LINE_THEME.planned.opacity,
                geodesic: true,
              }}
            />
          </>
        ) : null}
        {gpsPath.length > 1 ? (
          <>
            <Polyline
              path={gpsPath}
              options={{
                strokeColor: ADMIN_LINE_THEME.gpsOutline.color,
                strokeWeight: ADMIN_LINE_THEME.gpsOutline.weight,
                strokeOpacity: ADMIN_LINE_THEME.gpsOutline.opacity,
                geodesic: true,
              }}
            />
            <Polyline
              path={gpsPath}
              options={{
                strokeColor: ADMIN_LINE_THEME.gps.color,
                strokeWeight: ADMIN_LINE_THEME.gps.weight,
                strokeOpacity: ADMIN_LINE_THEME.gps.opacity,
                geodesic: true,
              }}
            />
          </>
        ) : null}
      </GoogleMap>
      {!mapReady || loading ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-[1px]"
          aria-hidden={!loading && mapReady}
        >
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
          <span className="text-sm font-medium text-slate-600">{loadingMessage}</span>
        </div>
      ) : null}
      {mapReady && hasRideRoute ? (
        <button
          type="button"
          onClick={handleShowRideRoute}
          title="Show ride route (from → to)"
          aria-label="Show ride route from start to destination"
          className={`absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-lg transition hover:bg-slate-50 ${
            showRideRoute
              ? "border-brand-600 text-brand-600"
              : "border-slate-200 text-slate-700"
          }`}
        >
          <RouteFabIcon />
        </button>
      ) : null}
      <MapLegend />
    </div>
  );
}
