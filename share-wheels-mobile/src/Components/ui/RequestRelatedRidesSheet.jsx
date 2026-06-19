import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RequestMatchingRides from "./RequestMatchingRides";
import { getRequestLockedRideId } from "../../Utils/myRequestUtils";
import { DS } from "../../theme/designSystem";
import { useThemedStyles } from "../../theme/useThemedStyles";

const SHEET_MAX = Dimensions.get("window").height * 0.72;

const RequestRelatedRidesSheet = ({
  visible,
  request,
  joiningRideId = null,
  onClose,
  onViewRide,
  onJoinRide,
}) => {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const translateY = useRef(new Animated.Value(SHEET_MAX)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(SHEET_MAX);
    }
  }, [visible, translateY]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: SHEET_MAX,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose?.());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) dismiss();
        else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const rideCount =
    (request?.matchingRides?.length || 0) +
    (request?.linkedRide ? 1 : 0);
  const lockedRideId = getRequestLockedRideId(request);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss} />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>Related driver rides</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {request?.from} → {request?.to}
              </Text>
            </View>
            <Pressable onPress={dismiss} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <RequestMatchingRides
              rides={request?.matchingRides || []}
              linkedRide={request?.linkedRide || null}
              lockedRideId={lockedRideId}
              role={request?.role || "Passenger"}
              joiningRideId={joiningRideId}
              onViewRide={onViewRide}
              onJoinRide={onJoinRide}
              emptyMessage={
                rideCount === 0
                  ? "No driver rides match this route and date yet."
                  : undefined
              }
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default RequestRelatedRidesSheet;

const createStyles = (c) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      maxHeight: SHEET_MAX,
      ...DS.shadow.card,
      elevation: 16,
    },
    handleWrap: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 6,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.textMuted,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 12,
    },
    headerTextCol: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    subtitle: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 2,
    },
    closeBtn: {
      fontSize: 20,
      color: c.textMuted,
      fontWeight: "700",
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
  });
