/** Themed tokens for passenger & courier request forms */
export const PASSENGER_THEME = {
  key: "passenger",
  gradient: ["#047857", "#059669", "#14B8A6"],
  heroIcon: "#059669",
  pageBg: "#F1F5F9",
  surface: "#FFFFFF",
  cardBorder: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  sections: {
    route: { icon: "navigate", bg: "#D1FAE5", color: "#059669" },
    schedule: { icon: "calendar", bg: "#E0E7FF", color: "#4F46E5" },
    preferences: { icon: "bag-handle", bg: "#FEF3C7", color: "#D97706" },
    pricing: { icon: "cash", bg: "#FFEDD5", color: "#EA580C" },
  },
  price: { bg: "#FFFBEB", border: "#FDE68A", icon: "#D97706" },
  date: { bg: "#ECFDF5", border: "#A7F3D0", icon: "#059669" },
};

export const COURIER_THEME = {
  key: "courier",
  gradient: ["#C2410C", "#EA580C", "#F59E0B"],
  heroIcon: "#EA580C",
  pageBg: "#F1F5F9",
  surface: "#FFFFFF",
  cardBorder: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  sections: {
    route: { icon: "navigate", bg: "#FFEDD5", color: "#EA580C" },
    schedule: { icon: "calendar", bg: "#FEF3C7", color: "#D97706" },
    parcel: { icon: "cube", bg: "#FEE2E2", color: "#DC2626" },
    pricing: { icon: "cash", bg: "#FEF9C3", color: "#CA8A04" },
    receiver: { icon: "person", bg: "#E0E7FF", color: "#4F46E5" },
  },
  price: { bg: "#FFFBEB", border: "#FDE68A", icon: "#D97706" },
  date: { bg: "#FFF7ED", border: "#FED7AA", icon: "#EA580C" },
  picker: { bg: "#FFF7ED", border: "#FED7AA", icon: "#EA580C" },
};
