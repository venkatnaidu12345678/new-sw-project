import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

const PAD = 8;
const RING = 3;

const SpotlightBackdrop = ({ rect, screenWidth, screenHeight }) => {
  if (!rect) return <View style={styles.fullDim} />;

  const x = Math.max(0, rect.x - PAD);
  const y = Math.max(0, rect.y - PAD);
  const w = Math.min(screenWidth - x, rect.width + PAD * 2);
  const h = Math.min(screenHeight - y, rect.height + PAD * 2);
  const dim = styles.dimPanel;

  return (
    <>
      <View style={[dim, { top: 0, left: 0, width: screenWidth, height: y }]} />
      <View style={[dim, { top: y, left: 0, width: x, height: h }]} />
      <View
        style={[dim, { top: y, left: x + w, width: screenWidth - x - w, height: h }]}
      />
      <View
        style={[dim, { top: y + h, left: 0, width: screenWidth, height: screenHeight - y - h }]}
      />
      <View
        style={[
          styles.ring,
          { top: y - RING, left: x - RING, width: w + RING * 2, height: h + RING * 2 },
        ]}
        pointerEvents="none"
      />
    </>
  );
};

const CoachMarkOverlay = ({
  visible,
  step,
  stepIndex,
  totalSteps,
  spotlight,
  onNext,
  onPrev,
  onSkip,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

  const tooltipStyle = useMemo(() => {
    if (!step || step.placement === "center" || !spotlight) {
      return {
        position: "absolute",
        left: 20,
        right: 20,
        top: SCREEN_H * 0.28,
      };
    }

    const cardH = 176;
    const margin = 16;
    const tooltipWidth = Math.min(340, SCREEN_W - 32);
    let top;

    if (step.placement === "top") {
      top = spotlight.y - cardH - margin;
      if (top < insets.top + 12) top = spotlight.y + spotlight.height + margin;
    } else {
      top = spotlight.y + spotlight.height + margin;
      if (top + cardH > SCREEN_H - insets.bottom - 24) {
        top = spotlight.y - cardH - margin;
      }
    }

    const maxLeft = Math.max(16, SCREEN_W - tooltipWidth - 16);
    const left = spotlight
      ? Math.max(16, Math.min(spotlight.x + spotlight.width / 2 - tooltipWidth / 2, maxLeft))
      : 16;

    return {
      position: "absolute",
      left,
      width: tooltipWidth,
      top: Math.max(insets.top + 12, Math.min(top, SCREEN_H - cardH - insets.bottom - 20)),
    };
  }, [step, spotlight, insets.top, insets.bottom, SCREEN_H, SCREEN_W]);

  if (!visible || !step) return null;

  const isLast = stepIndex >= totalSteps - 1;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.root}>
        <SpotlightBackdrop
          rect={spotlight}
          screenWidth={SCREEN_W}
          screenHeight={SCREEN_H}
        />

        <View style={[styles.card, tooltipStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.stepLabel, { color: colors.primary }]}>
            {stepIndex + 1} of {totalSteps}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{step.body}</Text>

          <View style={styles.actions}>
            <View style={styles.leftActions}>
              {stepIndex > 0 ? (
                <TouchableOpacity onPress={onPrev} hitSlop={12} activeOpacity={0.75}>
                  <Text style={[styles.back, { color: colors.textSecondary }]}>Back</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onSkip} hitSlop={12} activeOpacity={0.7}>
                <Text style={[styles.skip, { color: colors.textMuted }]}>Skip tour</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={onNext}
              activeOpacity={0.88}
            >
              <Text style={[styles.nextText, { color: colors.inverseText }]}>
                {isLast ? "Got it" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CoachMarkOverlay;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fullDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
  },
  dimPanel: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
  },
  ring: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: "#fff",
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    fontSize: 14,
    fontWeight: "700",
  },
  skip: {
    fontSize: 14,
    fontWeight: "600",
  },
  nextBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  nextText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
