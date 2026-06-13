/** Shared map palette — roles, routes, and polylines */
export const MAP_PIN_THEME = {
  driver: { color: "#1D4ED8", light: "#DBEAFE", icon: "car", label: "Driver" },
  passenger: { color: "#059669", light: "#D1FAE5", icon: "person", label: "Passenger" },
  courier: { color: "#EA580C", light: "#FFEDD5", icon: "cube", label: "Courier" },
  "route-from": { color: "#10B981", light: "#D1FAE5", icon: "flag", label: "Start" },
  "route-to": { color: "#E11D48", light: "#FFE4E6", icon: "flag", label: "End" },
  stopover: { color: "#7C3AED", light: "#EDE9FE", icon: "location-sharp", label: "Stop" },
  "participant-pickup": {
    color: "#0D9488",
    light: "#CCFBF1",
    icon: "arrow-down-circle",
    label: "Pickup",
  },
  "participant-drop": {
    color: "#DB2777",
    light: "#FCE7F3",
    icon: "arrow-up-circle",
    label: "Drop",
  },
};

export const ROLE_PIN_COLORS = Object.fromEntries(
  Object.entries(MAP_PIN_THEME).map(([role, t]) => [role, t.color])
);

export const ROLE_MAP_ICONS = Object.fromEntries(
  Object.entries(MAP_PIN_THEME).map(([role, t]) => [role, t.icon])
);

/** ShareWheels brand blue — all route polylines use these */
export const ROUTE_LINE_BLUE = "#2563EB";
export const ROUTE_LINE_BLUE_LIGHT = "#93C5FD";
export const ROUTE_LINE_BLUE_OUTLINE = "#BFDBFE";

export const MAP_LINE_THEME = {
  planned: {
    stroke: ROUTE_LINE_BLUE,
    outline: ROUTE_LINE_BLUE_OUTLINE,
    width: 5,
    outlineWidth: 8,
  },
  liveGps: { stroke: ROUTE_LINE_BLUE, width: 5 },
  liveGpsHalo: { stroke: "#FFFFFF", width: 8 },
  participantJourney: { stroke: ROUTE_LINE_BLUE, width: 5 },
  driverToParticipant: { stroke: ROUTE_LINE_BLUE, width: 5 },
  driverNavLeg: {
    stroke: ROUTE_LINE_BLUE,
    outline: ROUTE_LINE_BLUE_OUTLINE,
    width: 7,
    outlineWidth: 10,
  },
  routeOptions: [ROUTE_LINE_BLUE],
  routeInactive: ROUTE_LINE_BLUE_LIGHT,
};

