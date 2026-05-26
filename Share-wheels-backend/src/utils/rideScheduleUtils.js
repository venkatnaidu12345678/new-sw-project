/**
 * Parse scheduled ride start from date + startTime (HH:mm or ISO string).
 */
const parseRideScheduledStart = (ride) => {
  if (!ride?.date) return null;

  const raw = ride.startTime;
  const rideDay = new Date(ride.date);
  if (Number.isNaN(rideDay.getTime())) return null;

  if (!raw) return rideDay;

  const rawStr = String(raw).trim();
  if (/T/.test(rawStr) || rawStr.includes("Z")) {
    const iso = new Date(rawStr);
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  const match = rawStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const d = new Date(rideDay);
    d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    return d;
  }

  const parsed = new Date(rawStr);
  return Number.isNaN(parsed.getTime()) ? rideDay : parsed;
};

/** True when scheduled start is in the past (driver may start late). */
const isRideScheduledTimePassed = (ride) => {
  const start = parseRideScheduledStart(ride);
  return start ? start.getTime() < Date.now() : false;
};

/** True when scheduled start is still in the future (driver may start early). */
const isRideScheduledTimeFuture = (ride) => {
  const start = parseRideScheduledStart(ride);
  return start ? start.getTime() > Date.now() : false;
};

/** Driver may start before or after the scheduled time (not blocked by schedule). */
const canStartOutsideSchedule = (ride) =>
  isRideScheduledTimePassed(ride) || isRideScheduledTimeFuture(ride);

module.exports = {
  parseRideScheduledStart,
  isRideScheduledTimePassed,
  isRideScheduledTimeFuture,
  canStartOutsideSchedule,
};
