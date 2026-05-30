/**
 * Local calendar date helpers — avoid UTC shift from toISOString() (e.g. 27th → 26th in IST).
 */

/** Parse YYYY-MM-DD or Date as local midnight. */
export const parseLocalDate = (value) => {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const str = String(value).trim();
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const d = new Date(
      parseInt(ymd[1], 10),
      parseInt(ymd[2], 10) - 1,
      parseInt(ymd[3], 10),
      0,
      0,
      0,
      0
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Format a Date (or parseable value) as YYYY-MM-DD in local timezone. */
export const formatLocalISODate = (value) => {
  const d = value instanceof Date ? value : parseLocalDate(value);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Human-readable date for UI. Hermes requires valid Intl options only (no undefined).
 * @param {{ showYear?: boolean, weekday?: boolean }} opts
 */
export const formatDisplayDate = (value, opts = {}) => {
  const d = parseLocalDate(value);
  if (!d) return "";

  const { showYear = false, weekday = true } = opts;
  const intlOpts = {
    day: "numeric",
    month: "short",
  };
  if (weekday) {
    intlOpts.weekday = "short";
  }
  if (showYear) {
    intlOpts.year = "numeric";
  }

  try {
    return d.toLocaleDateString("en-IN", intlOpts);
  } catch {
    const parts = [d.getDate(), d.getMonth() + 1, d.getFullYear()];
    return parts.join("/");
  }
};

/** Parse HH:mm, ISO datetime, or Date into local hours/minutes. */
export const parseTimeParts = (timeValue) => {
  if (timeValue == null || timeValue === "") return null;

  const raw = String(timeValue).trim();
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (hhmm) {
    const hours = parseInt(hhmm[1], 10);
    const minutes = parseInt(hhmm[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  const d = timeValue instanceof Date ? timeValue : new Date(timeValue);
  if (!Number.isNaN(d.getTime())) {
    return { hours: d.getHours(), minutes: d.getMinutes() };
  }

  return null;
};

/** App-wide 12-hour time label (e.g. 2:30 PM). */
export const formatDisplayTime = (timeValue) => {
  const parts = parseTimeParts(timeValue);
  if (!parts) {
    if (typeof timeValue === "string" && timeValue.trim()) return timeValue;
    return "";
  }

  const d = new Date();
  d.setHours(parts.hours, parts.minutes, 0, 0);

  try {
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    const h = parts.hours % 12 || 12;
    const ampm = parts.hours >= 12 ? "PM" : "AM";
    return `${h}:${String(parts.minutes).padStart(2, "0")} ${ampm}`;
  }
};

/** Time + optional date for ride cards (12-hour). */
export const formatRideTimeLabel = (dateValue, timeValue) => {
  const time = formatDisplayTime(timeValue);
  if (time) return time;
  if (dateValue) {
    const fromDate = parseTimeParts(dateValue);
    if (fromDate) return formatDisplayTime(dateValue);
  }
  return "—";
};
