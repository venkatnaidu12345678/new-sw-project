import { useEffect, useRef, useState } from "react";
import { subscribeGpsUpdates, getCachedCoords } from "../Utils/gpsService";
import { computeBearing } from "../Components/maps/rideMapMarkers";

let CompassHeading = null;
try {
  CompassHeading = require("react-native-compass-heading").default;
} catch {
  /* native module not linked yet */
}

const COMPASS_DEGREE_RATE = 2;
const SMOOTH_FACTOR = 0.28;
const GPS_COURSE_SPEED_MS = 2.2;

const normalizeDeg = (deg) => ((deg % 360) + 360) % 360;

const lerpAngle = (from, to, t) => {
  const a = normalizeDeg(from);
  const b = normalizeDeg(to);
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return normalizeDeg(a + diff * t);
};

const isValidHeading = (h) => Number.isFinite(h) && h >= 0 && h <= 360;

/**
 * Real-time device heading like Google Maps:
 * compass when slow/stationary, GPS course when driving.
 */
export function useDeviceHeading({ enabled = false, latitude, longitude } = {}) {
  const [heading, setHeading] = useState(0);

  const compassRef = useRef(0);
  const gpsCourseRef = useRef(null);
  const speedRef = useRef(0);
  const lastPosRef = useRef(null);
  const smoothRef = useRef(0);
  const rafRef = useRef(null);
  const compassReadyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;

    const onCompass = ({ heading: h }) => {
      if (!active || !isValidHeading(h)) return;
      compassRef.current = normalizeDeg(h);
      compassReadyRef.current = true;
    };

    if (CompassHeading?.start) {
      CompassHeading.start(COMPASS_DEGREE_RATE, onCompass).catch(() => {
        compassReadyRef.current = false;
      });
    }

    const applyGps = (coords) => {
      if (!coords) return;
      if (Number.isFinite(coords.speed)) {
        speedRef.current = Math.max(0, coords.speed);
      }
      if (isValidHeading(coords.heading)) {
        gpsCourseRef.current = normalizeDeg(coords.heading);
      }

      const lat = Number(coords.latitude);
      const lng = Number(coords.longitude);
      const prev = lastPosRef.current;
      if (prev && Number.isFinite(lat) && Number.isFinite(lng)) {
        const dLat = lat - prev.lat;
        const dLng = lng - prev.lng;
        if (dLat * dLat + dLng * dLng > 1e-9) {
          gpsCourseRef.current = computeBearing(prev.lat, prev.lng, lat, lng);
        }
      }
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        lastPosRef.current = { lat, lng };
      }
    };

    const cached = getCachedCoords();
    if (cached) applyGps(cached);
    const unsubGps = subscribeGpsUpdates(applyGps);

    const resolveTarget = () => {
      const moving = speedRef.current >= GPS_COURSE_SPEED_MS;
      if (moving && isValidHeading(gpsCourseRef.current)) {
        return gpsCourseRef.current;
      }
      if (compassReadyRef.current) {
        return compassRef.current;
      }
      if (isValidHeading(gpsCourseRef.current)) {
        return gpsCourseRef.current;
      }
      return smoothRef.current;
    };

    const tick = () => {
      if (!active) return;
      const target = resolveTarget();
      smoothRef.current = lerpAngle(smoothRef.current, target, SMOOTH_FACTOR);
      const published = Math.round(smoothRef.current * 10) / 10;
      setHeading((prev) =>
        Math.abs(published - prev) >= 0.35 ? published : prev
      );
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      unsubGps();
      if (CompassHeading?.stop) {
        CompassHeading.stop().catch(() => {});
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, latitude, longitude]);

  return heading;
}
