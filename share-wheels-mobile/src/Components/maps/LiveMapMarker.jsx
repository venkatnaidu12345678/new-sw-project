import React, { useEffect, useRef } from "react";
const MIN_MOVE_DEG_SQ = 1e-10;
const ANIM_MS = 550;

/**
 * Live participant marker — animates between GPS updates instead of jumping.
 */
const LiveMapMarker = ({
  Marker,
  latitude,
  longitude,
  children,
  ...markerProps
}) => {
  const markerRef = useRef(null);
  const prevCoordRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const next = { latitude, longitude };
    const prev = prevCoordRef.current;
    const ref = markerRef.current;

    if (prev && ref?.animateMarkerToCoordinate) {
      const dLat = next.latitude - prev.latitude;
      const dLng = next.longitude - prev.longitude;
      if (dLat * dLat + dLng * dLng > MIN_MOVE_DEG_SQ) {
        ref.animateMarkerToCoordinate(next, ANIM_MS);
        prevCoordRef.current = next;
        return;
      }
    }

    prevCoordRef.current = next;
  }, [latitude, longitude]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return (
    <Marker
      ref={markerRef}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={false}
      {...markerProps}
    >
      {children}
    </Marker>
  );
};

export default LiveMapMarker;
