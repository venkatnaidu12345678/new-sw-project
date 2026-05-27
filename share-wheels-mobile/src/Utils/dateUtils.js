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

export const formatDisplayTime = (timeValue) => {
  if (!timeValue) return "";
  const parsed = new Date(timeValue);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      return parsed.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return `${parsed.getHours()}:${String(parsed.getMinutes()).padStart(2, "0")}`;
    }
  }
  if (typeof timeValue === "string") return timeValue;
  return "";
};
