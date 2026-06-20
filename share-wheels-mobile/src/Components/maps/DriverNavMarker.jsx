import React, { useEffect, useRef } from "react";
import DriverHeadingArrow from "./DriverHeadingArrow";

const MIN_MOVE_DEG_SQ = 1e-10;

/**
 * Driver navigation puck — smooth position + real-time heading rotation.
 */
const DriverNavMarker = ({
  Marker,
  latitude,
  longitude,
  heading = 0,
  title = "You",
  description = "Your location",
  size,
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
        ref.animateMarkerToCoordinate(next, 400);
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
      title={title}
      description={description}
      anchor={{ x: 0.5, y: 0.5 }}
      rotation={heading}
      flat
      tracksViewChanges={false}
      zIndex={25}
    >
      <DriverHeadingArrow size={size} />
    </Marker>
  );
};

export default DriverNavMarker;
