import { useState, useCallback, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { enrouteRequest } from "../ApiService/ridesApiServices";
import { useEnrouteSocket } from "./useAppSocket";
import { formatLocalISODate } from "../Utils/dateUtils";
import {
  buildEnrouteFetchPayload,
  countEnrouteByType,
  formatEnrouteItems,
  shouldRemoveEnrouteRow,
} from "../Utils/enrouteRequestUtils";

export function useEnrouteRequests({
  from,
  to,
  date,
  rideId,
  stopovers = [],
  routePolyline = "",
  enabled = true,
}) {
  const rideDate = formatLocalISODate(date) || "";
  const stopoversKey = useMemo(
    () =>
      (Array.isArray(stopovers) ? stopovers : [])
        .map((s) => String(s?.label || "").trim())
        .filter(Boolean)
        .join("|"),
    [stopovers]
  );
  const routePolylineKey = String(routePolyline || "").trim();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const removePickedFromList = useCallback((payload) => {
    if (!payload) return;
    setData((prev) => prev.filter((row) => !shouldRemoveEnrouteRow(row, payload)));
  }, []);

  const fetchData = useCallback(async () => {
    const payload = buildEnrouteFetchPayload({
      from,
      to,
      date,
      rideId,
      stopovers,
      routePolyline: routePolylineKey,
    });
    if (!payload) {
      setData([]);
      return [];
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await enrouteRequest(token, payload);
      const list = response?.requests ?? [];

      if (response?.success) {
        const formatted = formatEnrouteItems(list, from, to);
        setData(formatted);
        return formatted;
      }

      setData([]);
      return [];
    } catch (error) {
      console.log("Enroute fetch error:", error?.message);
      setData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [from, to, date, rideId, stopoversKey, stopovers, routePolylineKey]);

  useEnrouteSocket({
    from: enabled ? from : null,
    to: enabled ? to : null,
    date: rideDate,
    onRequestRemoved: removePickedFromList,
    onRequestAdded: () => {
      fetchData();
    },
  });

  useEffect(() => {
    if (enabled && from && to && rideDate) {
      fetchData();
    } else if (!enabled) {
      setData([]);
    }
  }, [enabled, from, to, rideDate, stopoversKey, routePolylineKey, fetchData]);

  const removeItem = useCallback((itemId) => {
    const key = String(itemId ?? "");
    if (!key) return;
    setData((prev) =>
      prev.filter(
        (row) =>
          String(row.id) !== key &&
          String(row.passengerId || "") !== key &&
          String(row.courierId || "") !== key
      )
    );
  }, []);

  const counts = useMemo(() => countEnrouteByType(data), [data]);

  return {
    data,
    loading,
    counts,
    rideDate,
    refresh: fetchData,
    removeItem,
    removePickedFromList,
  };
}
