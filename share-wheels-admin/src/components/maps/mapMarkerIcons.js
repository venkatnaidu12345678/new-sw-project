/** Pin markers + route colors for admin Google Maps */

export const ADMIN_MAP_THEME = {
  driver: { color: "#1D4ED8", icon: "car" },
  passenger: { color: "#059669", icon: "person" },
  courier: { color: "#EA580C", icon: "package" },
  "route-from": { color: "#10B981", icon: "flag" },
  "route-to": { color: "#E11D48", icon: "flag-checkered" },
  stopover: { color: "#7C3AED", icon: "pin" },
};

export const ROUTE_LINE_BLUE = "#2563EB";

export const ADMIN_LINE_THEME = {
  planned: { color: ROUTE_LINE_BLUE, weight: 5, opacity: 0.9 },
  plannedOutline: { color: "#BFDBFE", weight: 8, opacity: 0.95 },
  gps: { color: ROUTE_LINE_BLUE, weight: 6, opacity: 1 },
  gpsOutline: { color: "#FFFFFF", weight: 9, opacity: 0.95 },
};

const ICON_PATHS = {
  car: "M6.5 14.5h11M5 10l1.2-3.6h11.6L19 10M7.5 14.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm12 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z",
  person: "M12 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm-5.5 9v-1a5.5 5.5 0 0111 0v1",
  package: "M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zm0 0v15M4 7.5l8 4.5 8-4.5",
  flag: "M6 4v16M6 4h10l-2 3 2 3H6",
  "flag-checkered": "M6 4v16M6 4h9l-2.5 3L15 10H6",
  pin: "M12 21s6-6.2 6-11a6 6 0 10-12 0c0 4.8 6 11 6 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
};

const buildPinSvg = (color, iconKey, size = 44) => {
  const icon = ICON_PATHS[iconKey] || ICON_PATHS.pin;
  const h = Math.round(size * 1.2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 40 48">
  <defs>
    <filter id="s" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path filter="url(#s)" d="M20 2C11.16 2 4 9.16 4 18c0 11.5 16 28 16 28s16-16.5 16-28C36 9.16 28.84 2 20 2z" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="20" cy="17" r="9" fill="#ffffff" fill-opacity="0.22"/>
  <g transform="translate(20 17) scale(0.72) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="${icon}"/>
  </g>
</svg>`;
};

export const buildRoleMarkerIcon = (role, googleMaps) => {
  const meta = ADMIN_MAP_THEME[role] || ADMIN_MAP_THEME.passenger;
  const size = 44;
  const svg = buildPinSvg(meta.color, meta.icon, size);
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new googleMaps.maps.Size(size, Math.round(size * 1.2)),
    anchor: new googleMaps.maps.Point(size / 2, Math.round(size * 1.2) - 4),
  };
};
