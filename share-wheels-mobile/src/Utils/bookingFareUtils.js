/**
 * Book ride pricing — admin segment fare when joining a driver ride.
 * Not used for standalone passenger requests (see passengerOfferUtils.js).
 */

export const getSegmentBookingFareDisplay = (segmentPerSeat, seats = 1) => {
  const perSeat = Math.round(Number(segmentPerSeat) || 0);
  const seatCount = Math.max(1, Number(seats) || 1);
  const total = perSeat * seatCount;

  return {
    perSeat,
    total,
    hint:
      perSeat > 0
        ? `₹${perSeat}/seat × ${seatCount} seat${seatCount !== 1 ? "s" : ""} = ₹${total}`
        : "",
  };
};
