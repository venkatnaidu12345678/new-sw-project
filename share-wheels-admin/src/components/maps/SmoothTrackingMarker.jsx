import { useEffect, useRef, useState } from "react";
import { Marker } from "@react-google-maps/api";

const ANIM_MS = 550;

/**
 * Smoothly interpolates live GPS marker position between socket updates.
 */
export default function SmoothTrackingMarker({ lat, lng, icon, title, zIndex }) {
  const [position, setPosition] = useState(() => ({ lat, lng }));
  const displayRef = useRef({ lat, lng });
  const frameRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const next = { lat, lng };
    const from = displayRef.current;
    const moved =
      Math.abs(next.lat - from.lat) > 1e-8 || Math.abs(next.lng - from.lng) > 1e-8;
    if (!moved) return;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const start = { ...from };
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / ANIM_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const interpolated = {
        lat: start.lat + (next.lat - start.lat) * eased,
        lng: start.lng + (next.lng - start.lng) * eased,
      };

      displayRef.current = interpolated;
      setPosition(interpolated);

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = next;
        setPosition(next);
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [lat, lng]);

  if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
    return null;
  }

  return (
    <Marker
      position={position}
      icon={icon}
      title={title}
      zIndex={zIndex}
    />
  );
}
