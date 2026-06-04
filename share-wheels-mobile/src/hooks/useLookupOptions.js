import { useCallback, useEffect, useState } from "react";
import { getActiveLookupTypes } from "../ApiService/lookupsApiService";

export const LOOKUP_FALLBACKS = {
  courier_type: [
    { label: "Document", value: "document" },
    { label: "Parcel", value: "parcel" },
    { label: "Package", value: "package" },
  ],
  vehicle_type: [
    { label: "Car", value: "car" },
    { label: "SUV", value: "suv" },
    { label: "Hatchback", value: "hatchback" },
    { label: "Bike", value: "bike" },
    { label: "Van", value: "van" },
  ],
};

const cache = {};
const inflight = {};

const loadCategory = async (category, force = false) => {
  if (!force && cache[category]) return cache[category];
  if (!inflight[category]) {
    inflight[category] = getActiveLookupTypes(category)
      .then((list) => {
        const items =
          Array.isArray(list) && list.length > 0
            ? list
            : LOOKUP_FALLBACKS[category] || [];
        cache[category] = items;
        return items;
      })
      .catch(() => {
        const items = LOOKUP_FALLBACKS[category] || [];
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
  const [options, setOptions] = useState(cache[category] || LOOKUP_FALLBACKS[category] || []);
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
