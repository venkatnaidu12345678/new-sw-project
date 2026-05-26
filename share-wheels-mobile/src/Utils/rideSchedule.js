/** Parse scheduled ride start (date + HH:mm or ISO startTime). */
export const parseRideScheduledStart = (ride) => {
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
