import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseUrl, endPoints } from "../Config";

const authHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeQuote = (quote) => {
  if (!quote) return null;
  const price = quote.price ?? quote.pricePerSeat;
  return price != null ? { ...quote, price, pricePerSeat: price } : null;
};

/**
 * Suggested ride fare from admin distance tiers for a vehicle type.
 */
export const getFareQuote = async ({ vehicleType, distanceMeters, distanceKm } = {}) => {
  const type = String(vehicleType || "").trim().toLowerCase();
  if (!type) return null;

  const params = new URLSearchParams({ vehicleType: type });
  const km = Number(distanceKm);
  const meters = Number(distanceMeters);
  if (Number.isFinite(km) && km >= 0) {
    params.set("distanceKm", String(km));
  } else if (Number.isFinite(meters) && meters >= 0) {
    params.set("distanceMeters", String(Math.round(meters)));
  } else {
    return null;
  }

  try {
    const res = await fetch(`${baseUrl}${endPoints.fareQuoteurl}?${params}`, {
      headers: await authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.quote) return null;
    return normalizeQuote(data.quote);
  } catch {
    return null;
  }
};

/** Active fare tiers for a vehicle type (client-side quote fallback). */
export const getVehicleFareRules = async (vehicleType) => {
  const type = String(vehicleType || "").trim().toLowerCase();
  if (!type) return null;

  try {
    const res = await fetch(
      `${baseUrl}${endPoints.fareRulesurl}?${new URLSearchParams({ vehicleType: type })}`,
      { headers: await authHeaders() }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.fare) return null;
    return data.fare;
  } catch {
    return null;
  }
};
