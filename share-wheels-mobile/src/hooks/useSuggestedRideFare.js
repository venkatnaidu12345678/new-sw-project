import { useEffect, useMemo, useState } from "react";
import { getFareQuote, getVehicleFareRules } from "../ApiService/fareApiService";
import { polylinePathLengthMeters } from "../Utils/polyline";
import { computeFareQuoteLocal } from "../Utils/vehicleFareQuote";

const resolveVehicleType = (vehicleInfo) =>
  String(vehicleInfo?.vehicleType || vehicleInfo?.type || "")
    .trim()
    .toLowerCase();

export const resolveRouteDistanceMeters = (routePlan) => {
  const fromPlan = Number(routePlan?.distanceMeters);
  if (Number.isFinite(fromPlan) && fromPlan > 0) return Math.round(fromPlan);

  const fromKm = Number(routePlan?.distanceKm);
  if (Number.isFinite(fromKm) && fromKm > 0) return Math.round(fromKm * 1000);

  const polyline = String(routePlan?.routePolyline || "").trim();
  if (!polyline) return null;

  const computed = polylinePathLengthMeters(polyline);
  return computed > 0 ? Math.round(computed) : null;
};

export const resolveRouteDistanceKm = (routePlan) => {
  const meters = resolveRouteDistanceMeters(routePlan);
  if (!meters) return null;
  return meters / 1000;
};

const buildFareHint = (quote, routeKm) => {
  const fare = Math.round(quote.price);
  const kmLabel = Number(routeKm).toFixed(1);

  if (quote.progressive && quote.segments?.length > 1) {
    const parts = quote.segments.map((s) => `₹${s.rate}/km × ${s.km} km`).join(" + ");
    return { fare, hint: `${kmLabel} km: ${parts} = ₹${fare}` };
  }

  return { fare, hint: `₹${quote.rate}/km × ${kmLabel} km = ₹${fare}` };
};

/**
 * Fare = admin ₹/km rate × route km from the selected route.
 */
export function useSuggestedRideFare({ vehicleInfo, routePlan, enabled = true }) {
  const [fareHint, setFareHint] = useState("");
  const [fareLoading, setFareLoading] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState(null);

  const vehicleType = useMemo(() => resolveVehicleType(vehicleInfo), [vehicleInfo]);

  const distanceMeters = useMemo(
    () => resolveRouteDistanceMeters(routePlan),
    [
      routePlan?.distanceMeters,
      routePlan?.distanceKm,
      routePlan?.routePolyline,
      routePlan?.selectedRouteIndex,
    ]
  );

  const routeKm = useMemo(
    () => (distanceMeters ? distanceMeters / 1000 : null),
    [distanceMeters]
  );

  const routeKey = useMemo(
    () =>
      [
        routePlan?.routePolyline || "",
        routePlan?.selectedRouteIndex ?? "",
        routePlan?.distanceMeters ?? "",
      ].join("|"),
    [routePlan]
  );

  useEffect(() => {
    if (!enabled) {
      setFareHint("");
      setSuggestedPrice(null);
      setFareLoading(false);
      return undefined;
    }

    if (!vehicleType) {
      setFareHint("Add your vehicle type to calculate fare.");
      setSuggestedPrice(null);
      setFareLoading(false);
      return undefined;
    }

    if (!routePlan?.routePolyline) {
      setFareHint("Select a route on the map to calculate fare.");
      setSuggestedPrice(null);
      setFareLoading(false);
      return undefined;
    }

    if (!distanceMeters || !routeKm) {
      setFareHint("Calculating route distance…");
      setSuggestedPrice(null);
      setFareLoading(true);
      return undefined;
    }

    let cancelled = false;
    setFareLoading(true);
    setSuggestedPrice(null);

    (async () => {
      const rules = await getVehicleFareRules(vehicleType);
      let quote = rules?.tiers?.length
        ? computeFareQuoteLocal(rules.tiers, routeKm)
        : null;

      if (!quote?.price) {
        quote = await getFareQuote({ vehicleType, distanceMeters });
      }

      if (cancelled) return;

      setFareLoading(false);

      if (!quote?.price) {
        setSuggestedPrice(null);
        setFareHint(
          `No fare rule for ${vehicleType} at ${routeKm.toFixed(1)} km. Enter fare manually.`
        );
        return;
      }

      const { fare, hint } = buildFareHint(quote, routeKm);
      setSuggestedPrice(fare);
      setFareHint(hint);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, vehicleType, distanceMeters, routeKm, routeKey, routePlan?.routePolyline]);

  return {
    fareHint,
    fareLoading,
    suggestedPrice,
    distanceMeters,
    routeKm,
    vehicleType,
  };
}
