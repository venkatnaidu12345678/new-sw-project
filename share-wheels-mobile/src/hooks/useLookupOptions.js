import { useCallback, useEffect, useState } from "react";
import { getActiveLookupTypes } from "../ApiService/lookupsApiService";

export const ALLOWED_VEHICLE_TYPES = ["bike", "auto", "car"];

/** Normalize stored/API vehicle type to bike, auto, or car. */
export const normalizeVehicleType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  if (ALLOWED_VEHICLE_TYPES.includes(type)) return type;
  if (type === "scooter") return "bike";
  if (["hatchback", "sedan", "suv", "muv", "van"].includes(type)) return "car";
  return type;
};

export const LOOKUP_FALLBACKS = {
  courier_type: [
    { label: "Document", value: "document" },
    { label: "Parcel", value: "parcel" },
    { label: "Package", value: "package" },
  ],
  vehicle_type: [
    { label: "Bike", value: "bike" },
    { label: "Auto", value: "auto" },
    { label: "Car", value: "car" },
  ],
};

const filterVehicleTypeOptions = (options) => {
  const allowed = new Set(ALLOWED_VEHICLE_TYPES);
  return (options || []).filter((item) =>
    allowed.has(String(item?.value || "").trim().toLowerCase())
  );
};

const cache = {};
const inflight = {};

const normalizeOptions = (list, category) => {
  const fallbacks = LOOKUP_FALLBACKS[category] || [];
  const source =
    Array.isArray(list) && list.length > 0 ? list : fallbacks;
  const seen = new Set();
  const merged = [];

  for (const item of [...fallbacks, ...source]) {
    const value = String(item?.value || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    merged.push({
      label: String(item?.label || value).trim() || value,
      value,
    });
  }

  if (category === "vehicle_type") {
    const filtered = filterVehicleTypeOptions(merged);
    return filtered.length > 0 ? filtered : LOOKUP_FALLBACKS.vehicle_type;
  }

  return merged.length > 0 ? merged : fallbacks;
};

const loadCategory = async (category, force = false) => {
  if (!force && cache[category]) return cache[category];
  if (!inflight[category]) {
    inflight[category] = getActiveLookupTypes(category)
      .then((list) => {
        const items = normalizeOptions(list, category);
        cache[category] = items;
        return items;
      })
      .catch(() => {
        const items = normalizeOptions([], category);
        cache[category] = items;
        return items;
      })
      .finally(() => {
        delete inflight[category];
      });
  }
  return inflight[category];
};

export const refreshLookupOptions = (category) => {
  if (category) delete cache[category];
  else Object.keys(cache).forEach((k) => delete cache[k]);
};

/** Build picker items with a leading placeholder row. */
export const toPickerItems = (options, placeholderLabel = "Select") => {
  const rows = Array.isArray(options) ? options : [];
  return [
    { label: placeholderLabel, value: "" },
    ...rows.map((o) => ({
      label: o.label || o.value,
      value: o.value,
    })),
  ];
};

export const useLookupOptions = (category, placeholderLabel) => {
  const [options, setOptions] = useState(
    () => cache[category] || normalizeOptions([], category)
  );
  const [loading, setLoading] = useState(!cache[category]);

  const reload = useCallback(
    async (force = false) => {
      if (!category) return;
      if (force) refreshLookupOptions(category);
      setLoading(true);
      try {
        const list = await loadCategory(category, force);
        setOptions(list);
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  useEffect(() => {
    reload(false);
  }, [reload]);

  const pickerItems = toPickerItems(options, placeholderLabel);

  return { options, pickerItems, loading, reload };
};
