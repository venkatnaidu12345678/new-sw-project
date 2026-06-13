import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import {
  ADMIN_LINE_THEME,
  ADMIN_MAP_THEME,
  buildRoleMarkerIcon,
} from "./mapMarkerIcons";
import SmoothTrackingMarker from "./SmoothTrackingMarker";

const LIVE_ROLES = new Set(["driver", "passenger", "courier"]);

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

function FitBoundsHandler({ markers, plannedPath, map, fitSessionKey }) {
  const fittedSessionRef = useRef(null);

  useEffect(() => {
    if (!map || !fitSessionKey) return;
    if (fittedSessionRef.current === fitSessionKey) return;

    const structural = [
      ...markers.map((m) => ({ lat: m.lat, lng: m.lng })),
      ...(plannedPath.length > 1
        ? [plannedPath[0], plannedPath[plannedPath.length - 1]]
        : []),
    ].filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (!structural.length) return;

    fittedSessionRef.current = fitSessionKey;

    if (structural.length === 1) {
      map.setCenter(structural[0]);
      map.setZoom(14);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    structural.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [map, fitSessionKey, markers, plannedPath]);

  return null;
}

export default function GoogleTrackingMap({
  markers = [],
  plannedPath = [],
  gpsPath = [],
  fitSessionKey = "",
}) {
  const [map, setMap] = useState(null);
  const [authBlocked, setAuthBlocked] = useState(false);

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
      <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading Google Maps…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={13}
        onLoad={setMap}
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
        <FitBoundsHandler
          markers={markers}
          plannedPath={plannedPath}
          map={map}
          fitSessionKey={fitSessionKey}
        />
        {markers.map((m) => {
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
        {plannedPath.length > 1 ? (
          <>
            <Polyline
              path={plannedPath}
              options={{
                strokeColor: ADMIN_LINE_THEME.plannedOutline.color,
                strokeWeight: ADMIN_LINE_THEME.plannedOutline.weight,
                strokeOpacity: ADMIN_LINE_THEME.plannedOutline.opacity,
                geodesic: true,
              }}
            />
            <Polyline
              path={plannedPath}
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
      <MapLegend />
    </div>
  );
}
