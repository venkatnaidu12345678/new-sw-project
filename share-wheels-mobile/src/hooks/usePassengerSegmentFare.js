import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFareQuote, getVehicleFareRules } from "../ApiService/fareApiService";
import { getSegmentFareApi } from "../ApiService/ridesApiServices";
import {
  estimateSegmentKm,
  isFullRideSegment,
  isValidCorridorSegment,
} from "../Utils/rideCorridorUtils";
import { computeFareQuoteLocal } from "../Utils/vehicleFareQuote";
import { normalizeVehicleType } from "./useLookupOptions";

const resolveVehicleType = (ride) =>
  normalizeVehicleType(ride?.vehicle?.type) || "car";

const toKm = (meters) => {
  const km = Number(meters) / 1000;
  return Number.isFinite(km) && km > 0 ? km : null;
};

const buildFareHint = (quote, segmentKm) => {
  if (!quote || segmentKm == null) return "";
  const fare = Math.round(quote.price ?? quote.pricePerSeat ?? 0);
  const kmLabel = Number(segmentKm).toFixed(1);

  if (quote.progressive && quote.segments?.length > 1) {
    const parts = quote.segments.map((s) => `₹${s.rate}/km × ${s.km} km`).join(" + ");
    return `${kmLabel} km: ${parts} = ₹${fare}`;
  }

  if (quote.rate) {
    return `₹${quote.rate}/km × ${kmLabel} km = ₹${fare}`;
  }

  return `${kmLabel} km segment`;
};

/** Admin ₹/km tiers × segment distance (same logic as create ride). */
export const quoteAdminFareForSegment = async (ride, segmentKm) => {
  const vehicleType = resolveVehicleType(ride);
  if (!vehicleType || !segmentKm) return null;

  const rules = await getVehicleFareRules(vehicleType);
  let quote = rules?.tiers?.length
    ? computeFareQuoteLocal(rules.tiers, segmentKm)
    : null;

  if (!quote?.price) {
    quote = await getFareQuote({
      vehicleType,
      distanceKm: segmentKm,
    });
  }

  return quote;
};

const resolveFareFromApiQuote = async (ride, apiQuote, estimatedKm, storedFullKm) => {
  const segKm =
    toKm(apiQuote?.segmentDistanceMeters) ??
    estimatedKm;
  const fullKm =
    toKm(apiQuote?.fullRouteDistanceMeters) ??
    storedFullKm;

  if (
    apiQuote?.pricingSource === "admin_tiers" &&
    Number(apiQuote?.perSeatFare) > 0
  ) {
    return {
      perSeatFare: Math.round(Number(apiQuote.perSeatFare)),
      segmentKm: segKm,
      fullRouteKm: fullKm,
      fareHint:
        apiQuote.fareHint ||
        buildFareHint(
          {
            rate: apiQuote.rate,
            progressive: apiQuote.progressive,
            segments: apiQuote.fareSegments,
            price: apiQuote.perSeatFare,
          },
          segKm
        ),
    };
  }

  if (segKm) {
    const localQuote = await quoteAdminFareForSegment(ride, segKm);
    if (localQuote?.price) {
      return {
        perSeatFare: Math.round(localQuote.price),
        segmentKm: segKm,
        fullRouteKm: fullKm,
        fareHint: buildFareHint(localQuote, segKm),
      };
    }
  }

  return null;
};

/**
 * Per-seat fare for a passenger booking segment.
 * When fixedPerSeatFare is set (standalone request / enroute offer), admin tiers are skipped.
 */
export function usePassengerSegmentFare(ride, segment, seats = 1, options = {}) {
  const { fixedPerSeatFare } = options;
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

  const isFullCorridorSpan = useMemo(() => {
    if (!ride || !segment?.from || !segment?.to) return true;
    return isFullRideSegment(ride, segment.from, segment.to);
  }, [ride, segment?.from, segment?.to]);

  useEffect(() => {
    const fixed = Number(fixedPerSeatFare);
    if (Number.isFinite(fixed) && fixed > 0) {
      setPerSeatFare(Math.round(fixed));
      setSegmentKm(estimatedKm);
      setFullRouteKm(toKm(ride?.routeDistanceMeters));
      setFareHint("Your offer price");
      setLoading(false);
      return undefined;
    }

    if (!ride?._id || !segment?.from || !segment?.to) {
      setPerSeatFare(null);
      setSegmentKm(estimatedKm);
      setFullRouteKm(toKm(ride?.routeDistanceMeters));
      setFareHint("");
      setLoading(false);
      return undefined;
    }

    if (!isValidCorridorSegment(ride, segment.from, segment.to)) {
      setPerSeatFare(null);
      setSegmentKm(null);
      setFullRouteKm(null);
      setFareHint("");
      setLoading(false);
      return undefined;
    }

    const storedFullKm = toKm(ride.routeDistanceMeters);
    setFullRouteKm(storedFullKm);
    setSegmentKm(estimatedKm);

    let cancelled = false;
    setLoading(true);
    setPerSeatFare(null);

    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const apiQuote = await getSegmentFareApi(token, ride._id, {
          from: segment.from,
          to: segment.to,
          seats,
        });

        if (cancelled) return;

        const resolved = await resolveFareFromApiQuote(
          ride,
          apiQuote,
          estimatedKm,
          storedFullKm
        );

        if (resolved) {
          setPerSeatFare(resolved.perSeatFare);
          setSegmentKm(resolved.segmentKm);
          setFullRouteKm(resolved.fullRouteKm);
          setFareHint(resolved.fareHint);
          return;
        }

        const fallbackKm = toKm(apiQuote?.segmentDistanceMeters) ?? estimatedKm;
        if (fallbackKm) {
          const localQuote = await quoteAdminFareForSegment(ride, fallbackKm);
          if (!cancelled && localQuote?.price) {
            setPerSeatFare(Math.round(localQuote.price));
            setSegmentKm(fallbackKm);
            setFullRouteKm(storedFullKm);
            setFareHint(buildFareHint(localQuote, fallbackKm));
            return;
          }
        }

        if (!cancelled) {
          setPerSeatFare(0);
          setSegmentKm(fallbackKm);
          setFareHint("Fare rules not configured for this vehicle");
        }
      } catch {
        if (!cancelled) {
          const fallbackKm = estimatedKm;
          const localQuote = fallbackKm
            ? await quoteAdminFareForSegment(ride, fallbackKm)
            : null;

          if (localQuote?.price) {
            setPerSeatFare(Math.round(localQuote.price));
            setSegmentKm(fallbackKm);
            setFareHint(buildFareHint(localQuote, fallbackKm));
          } else {
            setPerSeatFare(0);
            setSegmentKm(fallbackKm);
            setFareHint("Could not calculate segment fare");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ride, segment?.from, segment?.to, seats, segmentKey, estimatedKm, fixedPerSeatFare]);

  const displayKm = segmentKm ?? estimatedKm;

  return {
    perSeatFare: perSeatFare ?? 0,
    segmentKm: displayKm,
    fullRouteKm,
    fareHint,
    loading,
    isFullCorridorSpan,
  };
}
