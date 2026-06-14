import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSegmentFareApi } from "../ApiService/ridesApiServices";
import {
  estimateSegmentKm,
  isValidCorridorSegment,
} from "../Utils/rideCorridorUtils";

const labelsMatch = (a, b) => {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
};

const isFullRideSegment = (ride, from, to) =>
  labelsMatch(from, ride?.from) && labelsMatch(to, ride?.to);

const toKm = (meters) => {
  const km = Number(meters) / 1000;
  return Number.isFinite(km) && km > 0 ? km : null;
};

/**
 * Per-seat fare and distance for a passenger booking segment (proportional to route km).
 */
export function usePassengerSegmentFare(ride, segment, seats = 1) {
  const [perSeatFare, setPerSeatFare] = useState(null);
  const [segmentKm, setSegmentKm] = useState(null);
  const [fullRouteKm, setFullRouteKm] = useState(null);
  const [fareHint, setFareHint] = useState("");
  const [loading, setLoading] = useState(false);

  const segmentKey = useMemo(
    () =>
      [
        ride?._id || "",
        segment?.from || "",
        segment?.to || "",
        String(seats),
      ].join("|"),
    [ride?._id, segment?.from, segment?.to, seats]
  );

  const estimatedKm = useMemo(() => {
    if (!ride || !segment?.from || !segment?.to) return null;
    return estimateSegmentKm(ride, segment.from, segment.to);
  }, [ride, segment?.from, segment?.to]);

  useEffect(() => {
    if (!ride?._id || !segment?.from || !segment?.to) {
      setPerSeatFare(Number(ride?.ride_amount) || 0);
      setSegmentKm(estimatedKm);
      setFullRouteKm(toKm(ride?.routeDistanceMeters));
      setFareHint("");
      setLoading(false);
      return undefined;
    }

    if (!isValidCorridorSegment(ride, segment.from, segment.to)) {
      setPerSeatFare(Number(ride?.ride_amount) || 0);
      setSegmentKm(null);
      setFullRouteKm(null);
      setFareHint("");
      setLoading(false);
      return undefined;
    }

    const storedFullKm = toKm(ride.routeDistanceMeters);
    setFullRouteKm(storedFullKm);
    setSegmentKm(estimatedKm);

    if (isFullRideSegment(ride, segment.from, segment.to) && storedFullKm) {
      const full = Math.round(Number(ride.ride_amount) || 0);
      setPerSeatFare(full);
      setSegmentKm(storedFullKm);
      setFareHint(`Full route · ${storedFullKm.toFixed(1)} km`);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const quote = await getSegmentFareApi(token, ride._id, {
          from: segment.from,
          to: segment.to,
          seats,
        });
        if (cancelled) return;

        if (quote && Number.isFinite(Number(quote.perSeatFare))) {
          const segKm = toKm(quote.segmentDistanceMeters) ?? estimatedKm;
          const fullKm = toKm(quote.fullRouteDistanceMeters) ?? storedFullKm;
          setPerSeatFare(Math.round(Number(quote.perSeatFare)));
          setSegmentKm(segKm);
          setFullRouteKm(fullKm);

          if (segKm != null && fullKm != null && !quote.isFullRide) {
            setFareHint(`${segKm.toFixed(1)} km of ${fullKm.toFixed(1)} km route`);
          } else if (segKm != null) {
            setFareHint(
              quote.isFullRide
                ? `Full route · ${segKm.toFixed(1)} km`
                : `${segment.from} → ${segment.to} · ${segKm.toFixed(1)} km`
            );
          } else {
            setFareHint(`${segment.from} → ${segment.to}`);
          }
        } else {
          setPerSeatFare(Math.round(Number(ride.ride_amount) || 0));
          setSegmentKm(estimatedKm);
          setFareHint(estimatedKm ? `${estimatedKm.toFixed(1)} km (estimated)` : "");
        }
      } catch {
        if (!cancelled) {
          setPerSeatFare(Math.round(Number(ride.ride_amount) || 0));
          setSegmentKm(estimatedKm);
          setFareHint(estimatedKm ? `${estimatedKm.toFixed(1)} km (estimated)` : "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ride, segment?.from, segment?.to, seats, segmentKey, estimatedKm]);

  const displayKm = segmentKm ?? estimatedKm;

  return {
    perSeatFare: perSeatFare ?? Math.round(Number(ride?.ride_amount) || 0),
    segmentKm: displayKm,
    fullRouteKm,
    fareHint,
    loading,
  };
}
