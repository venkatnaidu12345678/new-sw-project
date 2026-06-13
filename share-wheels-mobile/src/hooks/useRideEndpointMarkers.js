import { useEffect, useState, useMemo } from "react";
import { resolvePlaceCoords } from "../ApiService/placesApiService";

const coordCache = new Map();

const cacheKey = (label) => String(label || "").trim().toLowerCase();

const geocodeLabel = async (label, originCoords) => {
  const key = cacheKey(label);
  if (!key) return null;
  if (coordCache.has(key)) return coordCache.get(key);

  try {
    const coords = await resolvePlaceCoords(label, originCoords);
    if (coords) coordCache.set(key, coords);
    return coords;
  } catch {
    return null;
  }
};

const buildRosterRows = (participantRoutes = []) => {
  const rows = [];
  participantRoutes.forEach((p) => {
    if (p.from) {
      rows.push({
        id: `roster-${p.id}-pickup`,
        role: "participant-pickup",
        mapRole: p.role,
        title: `${p.name} pickup`,
        description: p.from,
        label: p.from,
      });
    }
    if (p.to) {
      rows.push({
        id: `roster-${p.id}-drop`,
        role: "participant-drop",
        mapRole: p.role,
        title: `${p.name} drop`,
        description: p.to,
        label: p.to,
      });
    }
  });
  return rows;
};

const buildEnrouteRows = (enrouteItems = []) => {
  const rows = [];
  enrouteItems.forEach((item) => {
    const raw = item.raw || item;
    const from = String(raw.from || "").trim();
    const to = String(raw.to || "").trim();
    const name = item.name || "Request";
    const type = item.type === "courier" ? "courier" : "passenger";
    if (from) {
      rows.push({
        id: `enroute-${item.id}-pickup`,
        role: "participant-pickup",
        mapRole: type,
        enroute: true,
        title: `En-route ${name}`,
        description: from,
        label: from,
      });
    }
    if (to) {
      rows.push({
        id: `enroute-${item.id}-drop`,
        role: "participant-drop",
        mapRole: type,
        enroute: true,
        title: `En-route ${name}`,
        description: to,
        label: to,
      });
    }
  });
  return rows;
};

/**
 * Driver-only: geocoded pickup/drop pins for ride roster + en-route requests.
 */
export function useRideEndpointMarkers({
  enabled = false,
  participantRoutes = [],
  enrouteItems = [],
  originCoords = null,
}) {
  const rows = useMemo(() => {
    if (!enabled) return [];
    const seen = new Set();
    const merged = [
      ...buildRosterRows(participantRoutes),
      ...buildEnrouteRows(enrouteItems),
    ];
    return merged.filter((row) => {
      const key = `${row.label}|${row.role}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [enabled, participantRoutes, enrouteItems]);

  const rowsKey = useMemo(
    () => rows.map((r) => `${r.id}|${r.label}`).join(";"),
    [rows]
  );

  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !rows.length) {
      setMarkers([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const resolved = [];
      for (const row of rows) {
        if (cancelled) return;
        const coords = await geocodeLabel(row.label, originCoords);
        if (!coords) continue;
        resolved.push({
          id: row.id,
          latitude: coords.lat,
          longitude: coords.lng,
          role: row.role,
          title: row.title,
          description: row.description || coords.label,
          isMe: false,
        });
      }
      if (!cancelled) {
        setMarkers(resolved);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, rowsKey, originCoords?.lat, originCoords?.lng]);

  return { markers, loading };
}
