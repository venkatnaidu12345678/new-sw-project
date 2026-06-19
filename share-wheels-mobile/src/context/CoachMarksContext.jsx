import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InteractionManager } from "react-native";
import CoachMarkOverlay from "../Components/coachMarks/CoachMarkOverlay";
import {
  MAIN_APP_TOUR_ID,
  mainAppTourSteps,
} from "../coachMarks/mainAppTour";
import { isTourCompleted, markTourCompleted } from "../coachMarks/storage";

const CoachMarksContext = createContext(null);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const useCoachMarks = () => {
  const ctx = useContext(CoachMarksContext);
  if (!ctx) {
    return {
      registerAnchor: () => {},
      unregisterAnchor: () => {},
      registerScrollPreparer: () => {},
      unregisterScrollPreparer: () => {},
      startTour: async () => false,
      tourActive: false,
    };
  }
  return ctx;
};

export const CoachMarksProvider = ({
  children,
  tabNavigationRef,
  autoStartEnabled = false,
  userId = null,
}) => {
  const anchorsRef = useRef({});
  const scrollPreparersRef = useRef({});
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const autoStartedRef = useRef(false);

  const steps = mainAppTourSteps;
  const step = steps[stepIndex] || null;

  const registerAnchor = useCallback((id, measureFn) => {
    anchorsRef.current[id] = measureFn;
  }, []);

  const unregisterAnchor = useCallback((id) => {
    delete anchorsRef.current[id];
  }, []);

  const registerScrollPreparer = useCallback((anchorId, fn) => {
    if (anchorId && typeof fn === "function") {
      scrollPreparersRef.current[anchorId] = fn;
    }
  }, []);

  const unregisterScrollPreparer = useCallback((anchorId) => {
    delete scrollPreparersRef.current[anchorId];
  }, []);

  const measureAnchor = useCallback(
    (anchorId) =>
      new Promise((resolve) => {
        const fn = anchorsRef.current[anchorId];
        if (!fn) {
          resolve(null);
          return;
        }
        fn(resolve);
      }),
    []
  );

  const focusStep = useCallback(
    async (targetStep) => {
      if (targetStep?.tab && tabNavigationRef?.current?.navigate) {
        tabNavigationRef.current.navigate(targetStep.tab);
        await delay(580);
      }

      if (!targetStep?.anchorId) {
        setSpotlight(null);
        return;
      }

      const preparer = scrollPreparersRef.current[targetStep.anchorId];
      if (preparer) {
        try {
          await preparer();
        } catch {
          /* scroll helper is best-effort */
        }
        await delay(targetStep.anchorId === "home_upcoming" ? 120 : 80);
      }

      let rect = null;
      await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));
      const maxAttempts = targetStep.anchorId === "home_upcoming" ? 14 : 10;
      for (let i = 0; i < maxAttempts; i += 1) {
        rect = await measureAnchor(targetStep.anchorId);
        if (rect) break;
        if (i === 4 && targetStep?.tab && tabNavigationRef?.current?.navigate) {
          // Re-focus the owning tab once if anchor wasn't measurable yet.
          tabNavigationRef.current.navigate(targetStep.tab);
        }
        await delay(targetStep.anchorId === "home_upcoming" ? 180 : 150);
      }
      setSpotlight(rect);
    },
    [measureAnchor, tabNavigationRef]
  );

  const endTour = useCallback(async (completed) => {
    setActive(false);
    setSpotlight(null);
    setStepIndex(0);
    if (completed) {
      await markTourCompleted(MAIN_APP_TOUR_ID, userId);
    }
    tabNavigationRef?.current?.navigate?.("Home");
  }, [tabNavigationRef, userId]);

  const startTour = useCallback(
    async ({ force = false } = {}) => {
      if (active) return true;
      if (!force && (await isTourCompleted(MAIN_APP_TOUR_ID, userId))) {
        return false;
      }

      setStepIndex(0);
      setActive(true);
      await focusStep(steps[0]);
      return true;
    },
    [active, focusStep, steps, userId]
  );

  const goNext = useCallback(async () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      await endTour(true);
      return;
    }
    setStepIndex(nextIndex);
    await focusStep(steps[nextIndex]);
  }, [stepIndex, steps, focusStep, endTour]);

  const goPrev = useCallback(async () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex < 0) return;
    setStepIndex(prevIndex);
    await focusStep(steps[prevIndex]);
  }, [stepIndex, steps, focusStep]);

  const skipTour = useCallback(async () => {
    await endTour(true);
  }, [endTour]);

  useEffect(() => {
    if (!autoStartEnabled || autoStartedRef.current || active) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      autoStartedRef.current = true;
      await startTour({ force: false });
    }, 1600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoStartEnabled, active, startTour]);

  const value = useMemo(
    () => ({
      registerAnchor,
      unregisterAnchor,
      registerScrollPreparer,
      unregisterScrollPreparer,
      startTour,
      tourActive: active,
    }),
    [
      registerAnchor,
      unregisterAnchor,
      registerScrollPreparer,
      unregisterScrollPreparer,
      startTour,
      active,
    ]
  );

  return (
    <CoachMarksContext.Provider value={value}>
      {children}
      <CoachMarkOverlay
        visible={active}
        step={step}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        spotlight={spotlight}
        onNext={goNext}
        onPrev={goPrev}
        onSkip={skipTour}
      />
    </CoachMarksContext.Provider>
  );
};
