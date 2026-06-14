/** Seats currently occupied by passengers still on the ride (excludes dropped). */
const getActiveBookedSeats = (ride) =>
  (ride?.passengers || []).reduce((sum, p) => {
    if (String(p?.status || "").toLowerCase() === "dropped") return sum;
    return sum + (Number(p?.requires_seats) || 0);
  }, 0);

module.exports = {
  getActiveBookedSeats,
};
