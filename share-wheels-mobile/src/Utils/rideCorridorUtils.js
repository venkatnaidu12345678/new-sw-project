const norm = (value) => String(value || "").trim();

/** Ordered corridor: ride start → stopovers → ride end. */
export const buildCorridorLabels = (ride) => {
  const labels = [];
  const seen = new Set();
  const add = (label) => {
    const text = norm(label);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    labels.push(text);
  };

  add(ride?.from);
  (Array.isArray(ride?.stopovers) ? ride.stopovers : []).forEach((stop) => {
    add(stop?.label || stop?.name);
  });
  add(ride?.to);
  return labels;
};

export const corridorHasSegments = (ride) => buildCorridorLabels(ride).length > 2;

const labelMatches = (a, b) => {
  const left = norm(a).toLowerCase();
  const right = norm(b).toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
};

export const isValidCorridorSegment = (ride, from, to) => {
  const corridor = buildCorridorLabels(ride);
  if (corridor.length < 2) return false;

  const fromIdx = corridor.findIndex((label) => labelMatches(from, label));
  const toIdx = corridor.findIndex((label) => labelMatches(to, label));
  if (fromIdx === -1 || toIdx === -1) return false;
  return fromIdx < toIdx;
};

export const defaultCorridorSegment = (ride) => ({
  from: norm(ride?.from),
  to: norm(ride?.to),
});

export const isFullRideSegment = (ride, from, to) => {
  if (!ride) return false;
  const corridor = buildCorridorLabels(ride);
  if (corridor.length < 2) {
    return labelMatches(from, ride.from) && labelMatches(to, ride.to);
  }

  const fromIdx = corridor.findIndex((label) => labelMatches(from, label));
  const toIdx = corridor.findIndex((label) => labelMatches(to, label));
  if (fromIdx < 0 || toIdx <= fromIdx) return false;

  return fromIdx === 0 && toIdx === corridor.length - 1;
};

/** Map search/request from→to onto the driver's corridor (canonical stop labels). */
export const resolveBookingSegmentFromContext = (ride, contextFrom, contextTo) => {
  const from = norm(contextFrom);
  const to = norm(contextTo);
  if (!from || !to || !ride) return null;

  if (!isValidCorridorSegment(ride, from, to)) {
    return null;
  }

  const corridor = buildCorridorLabels(ride);
  const fromIdx = corridor.findIndex((label) => labelMatches(from, label));
  const toIdx = corridor.findIndex((label) => labelMatches(to, label));
  if (fromIdx >= 0 && toIdx > fromIdx) {
    return { from: corridor[fromIdx], to: corridor[toIdx] };
  }

  return { from, to };
};

export const segmentDiffersFromFullRide = (ride, segment) => {
  if (!segment?.from || !segment?.to) return false;
  return !isFullRideSegment(ride, segment.from, segment.to);
};

/** Corridor-index estimate when Google segment km is unavailable. */
export const estimateSegmentKm = (ride, from, to) => {
  const fullMeters = Number(ride?.routeDistanceMeters);
  if (!Number.isFinite(fullMeters) || fullMeters <= 0) return null;
  if (!from || !to) return null;

  if (isFullRideSegment(ride, from, to)) {
    return fullMeters / 1000;
  }

  const corridor = buildCorridorLabels(ride);
  if (corridor.length < 2) return null;

  const fromIdx = corridor.findIndex((label) => labelMatches(from, label));
  const toIdx = corridor.findIndex((label) => labelMatches(to, label));
  if (fromIdx < 0 || toIdx <= fromIdx) return null;

  const ratio = (toIdx - fromIdx) / (corridor.length - 1);
  return (fullMeters * ratio) / 1000;
};
