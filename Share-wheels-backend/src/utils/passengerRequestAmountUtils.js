const { parseAmount } = require("../schemas/commonSchemas");

/** API sends per-seat offer; DB stores total (per-seat × seats). */
const resolvePassengerRequestStoredAmount = (perSeatInput, seatsNeeded) => {
  const perSeat = parseAmount(perSeatInput);
  if (perSeat === null || perSeat <= 0) return null;
  const seats = Math.max(1, Number(seatsNeeded) || 1);
  return Math.round(perSeat * seats);
};

const perSeatFromStoredPassengerAmount = (storedTotal, seatsNeeded) => {
  const total = Math.round(Number(storedTotal) || 0);
  if (total <= 0) return null;
  const seats = Math.max(1, Number(seatsNeeded) || 1);
  return Math.round(total / seats);
};

module.exports = {
  resolvePassengerRequestStoredAmount,
  perSeatFromStoredPassengerAmount,
};
