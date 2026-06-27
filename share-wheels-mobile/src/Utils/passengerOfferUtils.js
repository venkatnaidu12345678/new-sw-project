/** My Request cards: API amount is per-seat; total is computed on the client. */
export const getPassengerRequestOfferDisplay = (amount, seatsNeeded) => {
  const seats = Math.max(1, Number(seatsNeeded) || 1);
  const perSeat = Math.round(Number(amount) || 0);
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
