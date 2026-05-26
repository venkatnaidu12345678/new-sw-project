import { useEffect, useRef } from "react";
import {
  connectAppSocket,
  disconnectAppSocket,
  joinRideRoom,
  leaveRideRoom,
  joinEnrouteRoom,
  leaveEnrouteRoom,
  subscribeSocketEvent,
} from "../services/appSocket";

/**
 * Keep app socket alive while authenticated.
 */
export function useAppSocketConnection(enabled) {
  useEffect(() => {
    if (!enabled) {
      disconnectAppSocket();
      return undefined;
    }
    connectAppSocket();
    return () => {
      disconnectAppSocket();
    };
  }, [enabled]);
}

/**
 * Listen on ride room for participant / request updates.
 */
export function useRideSocket(rideId, { onParticipantsUpdated, onRequestUpdated } = {}) {
  const onParticipantsRef = useRef(onParticipantsUpdated);
  const onRequestRef = useRef(onRequestUpdated);

  useEffect(() => {
    onParticipantsRef.current = onParticipantsUpdated;
  }, [onParticipantsUpdated]);

  useEffect(() => {
    onRequestRef.current = onRequestUpdated;
  }, [onRequestUpdated]);

  useEffect(() => {
    if (!rideId) return undefined;

    let unsubParticipants = () => {};
    let unsubRequest = () => {};
    let active = true;

    (async () => {
      await joinRideRoom(rideId);
      if (!active) return;

      unsubParticipants = await subscribeSocketEvent(
        "rideParticipantsUpdated",
        (payload) => {
          if (
            payload?.rideId?.toString() ===
            (rideId?.toString?.() || String(rideId))
          ) {
            onParticipantsRef.current?.(payload);
          }
        }
      );

      unsubRequest = await subscribeSocketEvent("rideRequestUpdated", (payload) => {
        if (
          payload?.rideId?.toString() ===
          (rideId?.toString?.() || String(rideId))
        ) {
          onRequestRef.current?.(payload);
        }
      });
    })();

    return () => {
      active = false;
      unsubParticipants();
      unsubRequest();
      leaveRideRoom(rideId);
    };
  }, [rideId]);
}

/**
 * En-route picker: remove rows when another driver picks the same request.
 */
export function useEnrouteSocket({ from, to, date, onRequestRemoved }) {
  const onRemovedRef = useRef(onRequestRemoved);

  useEffect(() => {
    onRemovedRef.current = onRequestRemoved;
  }, [onRequestRemoved]);

  useEffect(() => {
    if (!from || !to) return undefined;

    let unsub = () => {};
    let active = true;

    (async () => {
      await joinEnrouteRoom({ from, to, date });
      if (!active) return;

      unsub = await subscribeSocketEvent("enrouteRequestRemoved", (payload) => {
        onRemovedRef.current?.(payload);
      });
    })();

    return () => {
      active = false;
      unsub();
      leaveEnrouteRoom({ from, to, date });
    };
  }, [from, to, date]);
}

/**
 * My Request screen: refresh when request is assigned elsewhere.
 */
export function useMyRequestsSocket(onUpdated) {
  const onUpdatedRef = useRef(onUpdated);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    let unsub = () => {};
    let active = true;

    (async () => {
      await connectAppSocket();
      if (!active) return;
      unsub = await subscribeSocketEvent("myRequestsUpdated", (payload) => {
        onUpdatedRef.current?.(payload);
      });
    })();

    return () => {
      active = false;
      unsub();
    };
  }, []);
}
