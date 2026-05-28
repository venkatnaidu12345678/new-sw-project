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
  const applyTimeOnRideDay = (hours, minutes, seconds = 0, millis = 0) => {
    const d = new Date(rideDay);
    d.setHours(hours, minutes, seconds, millis);
    return d;
  };

  const hhmmMatch = rawStr.match(/^(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    return applyTimeOnRideDay(
      parseInt(hhmmMatch[1], 10),
      parseInt(hhmmMatch[2], 10),
      0,
      0
    );
  }

  // Some clients send an ISO datetime from the time picker.
  // Use only its time component and always anchor it to ride.date.
  if (/T/.test(rawStr) || rawStr.includes("Z")) {
    const iso = new Date(rawStr);
    if (!Number.isNaN(iso.getTime())) {
      return applyTimeOnRideDay(
        iso.getHours(),
        iso.getMinutes(),
        iso.getSeconds(),
        iso.getMilliseconds()
      );
    }
  }

  const parsed = new Date(rawStr);
  if (!Number.isNaN(parsed.getTime())) {
    return applyTimeOnRideDay(
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
      parsed.getMilliseconds()
    );
  }
  return rideDay;
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

const RIDE_START_GRACE_MS = 6 * 60 * 60 * 1000;

/** Scheduled start + grace window (default 6h). */
const getRideStartGraceDeadline = (ride, graceMs = RIDE_START_GRACE_MS) => {
  const start = parseRideScheduledStart(ride);
  if (!start) return null;
  return new Date(start.getTime() + graceMs);
};

/** Pending rides past scheduled start + grace should auto-expire. */
const isRidePastStartGracePeriod = (ride, graceMs = RIDE_START_GRACE_MS) => {
  if (ride?.status !== "pending") return false;
  const deadline = getRideStartGraceDeadline(ride, graceMs);
  return deadline ? deadline.getTime() <= Date.now() : false;
};

module.exports = {
  parseRideScheduledStart,
  isRideScheduledTimePassed,
  isRideScheduledTimeFuture,
  canStartOutsideSchedule,
  RIDE_START_GRACE_MS,
  getRideStartGraceDeadline,
  isRidePastStartGracePeriod,
};
