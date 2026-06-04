import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveLocations } from "../ApiService/locationsApiService";
import { autocompletePlaces, getPlaceDetails } from "../ApiService/placesApiService";
import { getSuggestionLabel } from "../Utils/placeSuggestions";

const FALLBACK_LOCATIONS = [
  "Hyderabad",
  "Vijayawada",
  "Bhimavaram",
  "Visakhapatnam",
  "Bangalore",
  "Chennai",
];

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

let cachedLocations = null;
let cachePromise = null;

const loadAdminLocations = async () => {
  if (cachedLocations) return cachedLocations;
  if (!cachePromise) {
    cachePromise = getActiveLocations()
      .then((list) => {
        cachedLocations =
          Array.isArray(list) && list.length > 0 ? list : FALLBACK_LOCATIONS;
        return cachedLocations;
      })
      .catch(() => {
        cachedLocations = FALLBACK_LOCATIONS;
        return cachedLocations;
      })
      .finally(() => {
        cachePromise = null;
      });
  }
  return cachePromise;
};

export const refreshLocationSuggestions = () => {
  cachedLocations = null;
  cachePromise = null;
};

const filterAdminLocations = (locations, text) => {
  const query = String(text || "").trim().toLowerCase();
  if (!query) return [];
  return locations
    .filter((item) => item.toLowerCase().includes(query))
    .map((label) => ({ label, description: "Saved location" }));
};

export const useLocationSuggestions = () => {
  const [locations, setLocations] = useState(cachedLocations || []);
  const [loading, setLoading] = useState(!cachedLocations);
  const sessionTokenRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async (force = false) => {
    if (force) refreshLocationSuggestions();
    setLoading(true);
    try {
      const list = await loadAdminLocations();
      setLocations(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload(false);
  }, [reload]);

  const searchPlaces = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const query = String(text || "").trim();
        if (!query || query.length < MIN_QUERY_LEN) {
          resolve([]);
          return;
        }

        debounceRef.current = setTimeout(async () => {
          const requestId = ++requestIdRef.current;
          try {
            const predictions = await autocompletePlaces(
              query,
              sessionTokenRef.current
            );
            if (requestId !== requestIdRef.current) return;
            if (predictions.length > 0) {
              resolve(predictions);
              return;
            }
          } catch {
            /* fall through to admin list */
          }

          if (requestId !== requestIdRef.current) return;
          resolve(filterAdminLocations(locations, query));
        }, SEARCH_DEBOUNCE_MS);
      }),
    [locations]
  );

  /** @deprecated sync filter — use searchPlaces */
  const filterLocations = useCallback(
    (text) => filterAdminLocations(locations, text).map(getSuggestionLabel),
    [locations]
  );

  const resolvePlace = useCallback(async (item) => {
    if (!item) return null;
    if (typeof item === "string") {
      return { label: item };
    }

    const lat = Number(item.lat ?? item.latitude);
    const lng = Number(item.lng ?? item.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        label: getSuggestionLabel(item),
        lat,
        lng,
        placeId: item.placeId,
      };
    }

    if (item.placeId) {
      try {
        const details = await getPlaceDetails(item.placeId);
        if (details) {
          return {
            label: details.label || getSuggestionLabel(item),
            lat: details.lat,
            lng: details.lng,
            placeId: item.placeId,
          };
        }
      } catch {
        /* use label only */
      }
    }

    return { label: getSuggestionLabel(item), placeId: item.placeId };
  }, []);

  return {
    locations,
    loading,
    searchPlaces,
    resolvePlace,
    filterLocations,
    reload,
  };
};
