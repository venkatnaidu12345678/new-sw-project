import { useLiveRideMap } from "./useLiveRideMap";

/**
 * @deprecated Prefer useLiveRideMap. Kept for screens that still import useRideTracking.
 */
export const useRideTracking = ({
  rideId,
  token,
  enabled,
  refreshIntervalMs = 0,
  myRole,
  myUserId,
  myName,
}) => {
  const { tracking, ready, permission } = useLiveRideMap({
    rideId,
    token,
    enabled,
    myRole,
    myUserId,
    myName,
  });

  return {
    tracking,
    loading: enabled && !ready,
    refresh: () => {},
    permission,
    refreshIntervalMs,
  };
};

export { useLiveRideMap };
