/** @typedef {{ label: string, description?: string, placeId?: string, lat?: number, lng?: number }} PlaceSuggestion */

export const getSuggestionLabel = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.label || item.fullText || "";
};

export const getSuggestionKey = (item, index = 0) => {
  if (!item) return `suggestion-${index}`;
  if (typeof item === "string") return `${item}-${index}`;
  return item.placeId || `${item.label}-${index}`;
};

export const toCoordsPayload = (coords, label) => {
  if (!coords) return undefined;
  const lat = Number(coords.lat ?? coords.latitude);
  const lng = Number(coords.lng ?? coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return {
    lat,
    lng,
    label: String(coords.label || label || "").trim() || undefined,
  };
};
