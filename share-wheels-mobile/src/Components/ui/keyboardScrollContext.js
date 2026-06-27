import { createContext, useContext } from "react";

export const KeyboardScrollContext = createContext(null);

/** Scroll the parent KeyboardAwareScreen so a field + dropdown stay visible. */
export const useScrollFieldIntoView = () => {
  const ctx = useContext(KeyboardScrollContext);
  return ctx?.scrollFieldIntoView ?? (() => {});
};

/** Restore scroll after a dropdown selection (undo keyboard nudge). */
export const useScrollToRestPosition = () => {
  const ctx = useContext(KeyboardScrollContext);
  return ctx?.scrollToRestPosition ?? (() => {});
};

export const useKeyboardScrollRef = () => {
  const ctx = useContext(KeyboardScrollContext);
  return ctx?.scrollRef ?? null;
};
