/**
 * Parse scheduled ride start from date + startTime (HH:mm or ISO string).
 * ride.date is stored as UTC midnight for the chosen calendar day.
 */

const getUtcCalendarParts = (dateValue) => {
  if (dateValue == null || dateValue === "") return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
};

const scheduledStartFromParts = (parts, hours, minutes, seconds = 0, millis = 0) =>
  new Date(parts.year, parts.month, parts.day, hours, minutes, seconds, millis);

const formatStartTimeHHmm = (date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Normalize client startTime to HH:mm on the ride's calendar day. */
const normalizeStartTimeForStorage = (rideDate, startTime) => {
  const parts = getUtcCalendarParts(rideDate);
  if (!parts || startTime == null || startTime === "") return startTime;

  const raw = String(startTime).trim();
  const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    const h = parseInt(hhmmMatch[1], 10);
    const m = parseInt(hhmmMatch[2], 10);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) {
    const isoDay = getUtcCalendarParts(iso);
    if (
      isoDay &&
      isoDay.year === parts.year &&
      isoDay.month === parts.month &&
      isoDay.day === parts.day
    ) {
      return formatStartTimeHHmm(iso);
    }
    return formatStartTimeHHmm(scheduledStartFromParts(parts, iso.getHours(), iso.getMinutes()));
  }

  return raw;
};

const parseRideScheduledStart = (ride) => {
  const parts = getUtcCalendarParts(ride?.date);
  if (!parts) return null;

  const raw = ride?.startTime;
  if (raw == null || String(raw).trim() === "") {
    return scheduledStartFromParts(parts, 0, 0);
  }

  const rawStr = String(raw).trim();
  const hhmmMatch = rawStr.match(/^(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    return scheduledStartFromParts(
      parts,
      parseInt(hhmmMatch[1], 10),
      parseInt(hhmmMatch[2], 10),
      0,
      0
    );
  }

  if (/T/.test(rawStr) || rawStr.includes("Z")) {
    const iso = new Date(rawStr);
    if (!Number.isNaN(iso.getTime())) {
      const isoDay = getUtcCalendarParts(iso);
      if (
        isoDay &&
        isoDay.year === parts.year &&
        isoDay.month === parts.month &&
        isoDay.day === parts.day
      ) {
        return iso;
      }
      return scheduledStartFromParts(parts, iso.getHours(), iso.getMinutes());
    }
  }

  const parsed = new Date(rawStr);
  if (!Number.isNaN(parsed.getTime())) {
    return scheduledStartFromParts(
      parts,
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
      parsed.getMilliseconds()
    );
  }

  return scheduledStartFromParts(parts, 0, 0);
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

/** Driver cancel/postpone must be requested at least this long before scheduled start. */
const DRIVER_ACTION_MIN_LEAD_MS = 2 * 60 * 60 * 1000;

/** Maximum delay when postponing a ride once. */
const MAX_POSTPONE_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * Ensures a driver action (cancel/postpone) is at least 2 hours before scheduled start.
 */
const assertDriverActionLeadTime = (ride, leadMs = DRIVER_ACTION_MIN_LEAD_MS) => {
  const scheduledStart = parseRideScheduledStart(ride);
  if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) {
    return { ok: false, message: "Invalid ride schedule" };
  }
  const msUntilStart = scheduledStart.getTime() - Date.now();
  if (msUntilStart < leadMs) {
    const hours = leadMs / (60 * 60 * 1000);
    return {
      ok: false,
      message: `This action must be done at least ${hours} hours before the scheduled ride start time`,
      scheduledStart,
    };
  }
  return { ok: true, scheduledStart, msUntilStart };
};

/** Parse client new start (ISO datetime or HH:mm on ride day). */
const parsePostponedStartTime = (ride, newStartTime) => {
  const scheduledStart = parseRideScheduledStart(ride);
  if (!scheduledStart) return null;

  const raw = String(newStartTime || "").trim();
  if (!raw) return null;

  if (/T/.test(raw) || raw.includes("Z")) {
    const iso = new Date(raw);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) {
    const parts = getUtcCalendarParts(ride.date);
    if (!parts) return null;
    return scheduledStartFromParts(parts, parseInt(hhmm[1], 10), parseInt(hhmm[2], 10));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const applyScheduledStartToRide = (ride, scheduledStart) => {
  const parts = getUtcCalendarParts(scheduledStart);
  if (!parts) return;
  ride.date = new Date(Date.UTC(parts.year, parts.month, parts.day, 0, 0, 0, 0));
  ride.startTime = formatStartTimeHHmm(scheduledStart);
};

/** Scheduled start + grace window (default 6h). */
const getRideStartGraceDeadline = (ride, graceMs = RIDE_START_GRACE_MS) => {
  const start = parseRideScheduledStart(ride);
  if (!start || Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + graceMs);
};

/**
 * Pending rides expire only after scheduled start + 6h (never while still in the future).
 */
const isRidePastStartGracePeriod = (ride, graceMs = RIDE_START_GRACE_MS) => {
  if (ride?.status !== "pending") return false;
  const start = parseRideScheduledStart(ride);
  if (!start || Number.isNaN(start.getTime())) return false;
  if (start.getTime() > Date.now()) return false;
  return start.getTime() + graceMs <= Date.now();
};

/** Reject create/postpone when scheduled start is not strictly in the future. */
const assertScheduledStartInFuture = (rideOrDate, startTime, minLeadMs = 0) => {
  const ride =
    rideOrDate && typeof rideOrDate === "object" && "date" in rideOrDate
      ? rideOrDate
      : { date: rideOrDate, startTime };

  const scheduledStart = parseRideScheduledStart(ride);
  if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) {
    return { ok: false, message: "Invalid ride date or start time" };
  }

  const msUntilStart = scheduledStart.getTime() - Date.now();
  if (msUntilStart < minLeadMs) {
    return {
      ok: false,
      message: "Scheduled ride time must be in the future",
      scheduledStart,
    };
  }

  return { ok: true, scheduledStart, msUntilStart };
};

module.exports = {
  parseRideScheduledStart,
  isRideScheduledTimePassed,
  isRideScheduledTimeFuture,
  canStartOutsideSchedule,
  RIDE_START_GRACE_MS,
  DRIVER_ACTION_MIN_LEAD_MS,
  MAX_POSTPONE_DURATION_MS,
  formatStartTimeHHmm,
  normalizeStartTimeForStorage,
  assertDriverActionLeadTime,
  assertScheduledStartInFuture,
  parsePostponedStartTime,
  applyScheduledStartToRide,
  getRideStartGraceDeadline,
  isRidePastStartGracePeriod,
};
