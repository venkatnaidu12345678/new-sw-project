import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FormPopoverShell from "./FormPopoverShell";
import { buildCorridorLabels } from "../../Utils/rideCorridorUtils";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

const DriverStopoversPopover = ({
  visible,
  onClose,
  from = "",
  to = "",
  stopovers = [],
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const corridor = useMemo(
    () =>
      buildCorridorLabels({
        from,
        to,
        stopovers,
      }),
    [from, to, stopovers]
  );

  const stopoverCount = Array.isArray(stopovers) ? stopovers.length : 0;

  if (!visible || stopoverCount < 1) return null;

  return (
    <FormPopoverShell visible={visible} onClose={onClose}>
      <View style={styles.handle} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.infoBg }]}>
            <Icon name="git-commit-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Route stopovers</Text>
            <Text style={styles.subtitle}>
              {stopoverCount} stop{stopoverCount === 1 ? "" : "s"} on your ride
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Icon name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.timelineCard}>
          {corridor.map((label, index) => {
            const isStart = index === 0;
            const isEnd = index === corridor.length - 1;
            const isStopover = !isStart && !isEnd;
            const stopIndex = index;

            return (
              <View key={`${label}-${index}`} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  {!isStart ? <View style={styles.railLineTop} /> : null}
                  <View
                    style={[
                      styles.dot,
                      isStart && { backgroundColor: colors.successText },
                      isEnd && { backgroundColor: colors.errorText },
                      isStopover && { backgroundColor: colors.primary },
                    ]}
                  >
                    {isStopover ? (
                      <Text style={styles.dotText}>{stopIndex}</Text>
                    ) : (
                      <Icon
                        name={isStart ? "navigate" : "flag"}
                        size={12}
                        color={colors.inverseText}
                      />
                    )}
                  </View>
                  {!isEnd ? <View style={styles.railLineBottom} /> : null}
                </View>

                <View style={styles.pointBody}>
                  <Text style={styles.pointKind}>
                    {isStart ? "Start" : isEnd ? "Destination" : `Stop ${stopIndex}`}
                  </Text>
                  <Text style={styles.pointLabel} numberOfLines={3}>
                    {label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </FormPopoverShell>
  );
};

export default DriverStopoversPopover;

const createStyles = (c) =>
  StyleSheet.create({
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 8,
    },
    content: { paddingHorizontal: 20, paddingBottom: 28 },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
      gap: 12,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: { flex: 1 },
    title: { fontSize: 18, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 13, color: c.textMuted, marginTop: 4 },
    timelineCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "stretch",
      minHeight: 56,
    },
    timelineRail: {
      width: 28,
      alignItems: "center",
    },
    railLineTop: {
      width: 2,
      flex: 1,
      backgroundColor: c.border,
      minHeight: 8,
    },
    railLineBottom: {
      width: 2,
      flex: 1,
      backgroundColor: c.border,
      minHeight: 8,
    },
    dot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    dotText: {
      fontSize: 11,
      fontWeight: "800",
      color: c.inverseText,
    },
    pointBody: {
      flex: 1,
      paddingVertical: 8,
      paddingLeft: 8,
    },
    pointKind: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 2,
    },
    pointLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      lineHeight: 20,
    },
  });
