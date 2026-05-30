/** Parse scheduled ride start — mirrors backend rideScheduleUtils. */
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

export const parseRideScheduledStart = (ride) => {
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

export const isRideScheduledTimePassed = (ride) => {
  const start = parseRideScheduledStart(ride);
  return start ? start.getTime() < Date.now() : false;
};

export const isRideScheduledTimeFuture = (ride) => {
  const start = parseRideScheduledStart(ride);
  return start ? start.getTime() > Date.now() : false;
};

export const formatScheduledStart = (ride) => {
  const start = parseRideScheduledStart(ride);
  if (!start) return "";
  return start.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const DRIVER_ACTION_MIN_LEAD_MS = 2 * 60 * 60 * 1000;

export const canDriverCancel = (ride) => {
  const start = parseRideScheduledStart(ride);
  if (!start) return false;
  return start.getTime() - Date.now() >= DRIVER_ACTION_MIN_LEAD_MS;
};

export const msUntilScheduledStart = (ride) => {
  const start = parseRideScheduledStart(ride);
  return start ? start.getTime() - Date.now() : null;
};

export const formatLeadTimeHint = (ride) => {
  const ms = msUntilScheduledStart(ride);
  if (ms == null) return "";
  if (ms < 0) return "scheduled time has passed";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m until start`;
  return `${m}m until start`;
};
