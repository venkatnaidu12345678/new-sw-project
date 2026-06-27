import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardScrollContext } from "./keyboardScrollContext";

const DEFAULT_KEYBOARD_HEIGHT = Platform.OS === "ios" ? 320 : 280;

/**
 * Wraps screens/forms so inputs stay visible when the keyboard opens.
 * Use scrollable={true} for long forms; false for chat-style layouts with FlatList.
 */
const KeyboardAwareScreen = ({
  children,
  header,
  headerStyle,
  style,
  contentContainerStyle,
  scrollable = false,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = "always",
  scrollViewProps = {},
}) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const keyboardScrollAdjustRef = useRef(0);
  const keyboardHeightRef = useRef(DEFAULT_KEYBOARD_HEIGHT);
  const onScrollPropRef = useRef(scrollViewProps.onScroll);
  onScrollPropRef.current = scrollViewProps.onScroll;

  const offset =
    keyboardVerticalOffset + (Platform.OS === "ios" ? insets.top : 0);

  const behavior = Platform.OS === "ios" ? "padding" : undefined;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current =
        event?.endCoordinates?.height || DEFAULT_KEYBOARD_HEIGHT;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollFieldIntoView = useCallback(
    (targetRef, { dropdownSpace = 0, delay = 80 } = {}) => {
      const target = targetRef?.current;
      const scrollView = scrollRef.current;
      if (!target || !scrollView) return;

      setTimeout(() => {
        target.measureInWindow((_x, y, _w, h) => {
          const windowH = Dimensions.get("window").height;
          const keyboardH =
            keyboardHeightRef.current || DEFAULT_KEYBOARD_HEIGHT;
          const visibleBottom = windowH - keyboardH - insets.bottom - 12;
          const blockBottom = y + h + dropdownSpace;

          if (blockBottom <= visibleBottom) return;

          const delta = Math.min(blockBottom - visibleBottom + 8, 96);
          keyboardScrollAdjustRef.current += delta;
          scrollView.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: true,
          });
        });
      }, delay);
    },
    [insets.bottom]
  );

  const scrollToRestPosition = useCallback(
    (_targetRef, { delay = Platform.OS === "ios" ? 120 : 160 } = {}) => {
      const scrollView = scrollRef.current;
      if (!scrollView) return;

      setTimeout(() => {
        const revert = keyboardScrollAdjustRef.current;
        if (revert > 0) {
          const nextY = Math.max(0, scrollYRef.current - revert);
          scrollView.scrollTo({ y: nextY, animated: true });
          scrollYRef.current = nextY;
          keyboardScrollAdjustRef.current = 0;
          return;
        }

        scrollView.scrollTo({ y: 0, animated: true });
        scrollYRef.current = 0;
      }, delay);
    },
    []
  );

  const keyboardScrollValue = useMemo(
    () => ({ scrollRef, scrollFieldIntoView, scrollToRestPosition }),
    [scrollFieldIntoView, scrollToRestPosition]
  );

  const handleScroll = useCallback((event) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
    onScrollPropRef.current?.(event);
  }, []);

  const body = scrollable ? (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentContainerStyle={[styles.scrollGrow, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      bounces={false}
      nestedScrollEnabled
      {...scrollViewProps}
      onScroll={handleScroll}
      scrollEventThrottle={scrollViewProps.scrollEventThrottle ?? 16}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <KeyboardScrollContext.Provider value={keyboardScrollValue}>
      <KeyboardAvoidingView
        style={[styles.flex, style]}
        behavior={behavior}
        keyboardVerticalOffset={offset}
      >
        {header ? (
          <View style={[styles.headerSlot, headerStyle]}>{header}</View>
        ) : null}
        {body}
      </KeyboardAvoidingView>
    </KeyboardScrollContext.Provider>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollGrow: { flexGrow: 1 },
  headerSlot: {
    flexShrink: 0,
    zIndex: 10,
    elevation: 4,
  },
});

export default KeyboardAwareScreen;
