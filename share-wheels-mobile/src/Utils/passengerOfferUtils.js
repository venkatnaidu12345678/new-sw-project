/**
 * Passenger request pricing (create / edit / My Request):
 * - User enters per-seat in the form
 * - API stores total offer as amount_will (per-seat × seats)
 * - UI reads stored total and derives per-seat + total for display
 *
 * Book ride pricing lives in bookingFareUtils.js (segment/admin fare only).
 */

export const perSeatFromStoredPassengerAmount = (storedTotal, seatsNeeded) => {
  const total = Math.round(Number(storedTotal) || 0);
  if (total <= 0) return 0;
  const seats = Math.max(1, Number(seatsNeeded) || 1);
  return Math.round(total / seats);
};

/** API payload: per-seat from form → stored total for amount_will. */
export const toPassengerRequestStoredTotal = (perSeatInput, seatsNeeded) => {
  const perSeat = Math.round(Number(perSeatInput) || 0);
  if (perSeat <= 0) return 0;
  const seats = Math.max(1, Number(seatsNeeded) || 1);
  return perSeat * seats;
};

/** Display from API stored total (amount / amount_will on passenger request). */
export const getPassengerRequestOfferDisplay = (storedTotal, seatsNeeded) => {
  const seats = Math.max(1, Number(seatsNeeded) || 1);
  const total = Math.round(Number(storedTotal) || 0);
  const perSeat = total > 0 ? Math.round(total / seats) : 0;

  return {
    perSeat,
    total,
    hint:
      perSeat > 0
        ? `${seats} seat${seats !== 1 ? "s" : ""} × ₹${perSeat} per seat`
        : "",
  };
};

/** Display when per-seat is already known (form preview, enroute rows). */
export const getPassengerOfferFromPerSeat = (perSeatInput, seatsNeeded) => {
  const seats = Math.max(1, Number(seatsNeeded) || 1);
  const perSeat = Math.round(Number(perSeatInput) || 0);
  const total = perSeat * seats;

  return {
    perSeat,
    total,
    hint:
      perSeat > 0
        ? `${seats} seat${seats !== 1 ? "s" : ""} × ₹${perSeat} per seat`
        : "",
  };
};
