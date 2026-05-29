/** Parse scheduled ride start (date + HH:mm or ISO startTime). Matches backend rideScheduleUtils. */
export const parseRideScheduledStart = (ride) => {
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

/** Human-readable time until scheduled start (for UI hints). */
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
