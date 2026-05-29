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

    let active = true;
    const cleanups = [];

    (async () => {
      await joinRideRoom(rideId);
      if (!active) return;

      const unsubParticipants = await subscribeSocketEvent(
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
      if (!active) {
        unsubParticipants();
        return;
      }
      cleanups.push(unsubParticipants);

      const unsubRequest = await subscribeSocketEvent("rideRequestUpdated", (payload) => {
        if (
          payload?.rideId?.toString() ===
          (rideId?.toString?.() || String(rideId))
        ) {
          onRequestRef.current?.(payload);
        }
      });
      if (!active) {
        unsubRequest();
        return;
      }
      cleanups.push(unsubRequest);
    })();

    return () => {
      active = false;
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
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

    let active = true;
    const cleanups = [];

    (async () => {
      await joinEnrouteRoom({ from, to, date });
      if (!active) return;

      const unsub = await subscribeSocketEvent("enrouteRequestRemoved", (payload) => {
        onRemovedRef.current?.(payload);
      });
      if (!active) {
        unsub();
        return;
      }
      cleanups.push(unsub);
    })();

    return () => {
      active = false;
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
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
    let active = true;
    const cleanups = [];

    (async () => {
      await connectAppSocket();
      if (!active) return;
      const unsub = await subscribeSocketEvent("myRequestsUpdated", (payload) => {
        onUpdatedRef.current?.(payload);
      });
      if (!active) {
        unsub();
        return;
      }
      cleanups.push(unsub);
    })();

    return () => {
      active = false;
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
    };
  }, []);
}
