import React from "react";

import { View, Text, StyleSheet } from "react-native";

import Icon from "react-native-vector-icons/Ionicons";

import { useTheme } from "../../context/ThemeContext";

import { useThemedStyles } from "../../theme/useThemedStyles";

import DriverParticipantsSliderContent, {

  DriverParticipantsSheetHeader,

} from "../DriverParticipantsSliderContent";



const SummaryChip = ({ icon, label, value, tint, styles, iconColor }) => (

  <View style={[styles.summaryChip, { backgroundColor: tint }]}>

    <Icon name={icon} size={16} color={iconColor} />

    <Text style={styles.summaryValue}>{value}</Text>

    <Text style={styles.summaryLabel}>{label}</Text>

  </View>

);



export const buildParticipantsDragHeader = ({

  styles,

  colors,

  tabs,

  activeTabIndex,

  onTabChange,

  passengers,

  couriers,

}) => (

  <View style={styles.dragHeader}>

    <View style={styles.titleRow}>

      <View style={styles.titleLeft}>

        <View style={styles.titleIcon}>

          <Icon name="people" size={20} color={colors.inverseText} />

        </View>

        <View style={styles.titleTextCol}>

          <Text style={styles.cardTitle}>Participants</Text>

          <Text style={styles.cardSubtitle}>

            Drag down to close · manage riders on this ride

          </Text>

        </View>

      </View>

    </View>



    <View style={styles.summaryRow}>

      <SummaryChip

        icon="person"

        label="Passengers"

        value={passengers.length}

        tint={colors.successBg}

        styles={styles}

        iconColor={colors.successText}

      />

      <SummaryChip

        icon="cube"

        label="Couriers"

        value={couriers.length}

        tint={colors.tintOrange}

        styles={styles}

        iconColor="#EA580C"

      />

    </View>



    <DriverParticipantsSheetHeader

      tabs={tabs}

      activeTabIndex={activeTabIndex}

      onTabChange={onTabChange}

      passengers={passengers}

      couriers={couriers}

    />

  </View>

);



const DriverParticipantsSheet = ({

  visible,

  tabs,

  activeTabIndex,

  detailsLoading,

  passengers,

  couriers,

  rideFrom,

  rideTo,

  rideStatus,

  isRideStarted,

  onViewParticipantRoute,

  onStartVerify,

  onDropPassenger,

  onDeliverCourier,

  onCall,

  onMessage,

  onRemovePassenger,

  onRemoveCourier,

  onPressPassenger,

  onPressCourier,

}) => {

  const styles = useThemedStyles(createStyles);

  if (!visible) return null;



  return (

    <View style={styles.body}>

      <DriverParticipantsSliderContent

        tabs={tabs}

        activeTabIndex={activeTabIndex}

        detailsLoading={detailsLoading}

        passengers={passengers}

        couriers={couriers}

        rideFrom={rideFrom}

        rideTo={rideTo}

        rideStatus={rideStatus}

        isRideStarted={isRideStarted}

        onViewParticipantRoute={onViewParticipantRoute}

        onVerifyPassenger={(item) => onStartVerify?.(item, "passenger")}

        onVerifyCourier={(item) => onStartVerify?.(item, "courier")}

        onDropPassenger={onDropPassenger}

        onDeliverCourier={onDeliverCourier}

        onCall={onCall}

        onMessage={onMessage}

        onRemovePassenger={onRemovePassenger}

        onRemoveCourier={onRemoveCourier}

        onPressPassenger={onPressPassenger}

        onPressCourier={onPressCourier}

      />

    </View>

  );

};



export default DriverParticipantsSheet;



export const participantsSheetStyles = (c) =>

  StyleSheet.create({

    dragHeader: {

      paddingHorizontal: 2,

      paddingTop: 0,

      paddingBottom: 4,

    },

    titleRow: {

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      marginBottom: 12,

      paddingHorizontal: 2,

    },

    titleLeft: {

      flexDirection: "row",

      alignItems: "center",

      gap: 12,

      flex: 1,

    },

    titleIcon: {

      width: 42,

      height: 42,

      borderRadius: 14,

      backgroundColor: c.primary,

      alignItems: "center",

      justifyContent: "center",

    },

    cardTitle: {

      fontSize: 18,

      fontWeight: "800",

      color: c.text,

    },

    cardSubtitle: {

      fontSize: 12,

      color: c.textMuted,

      marginTop: 2,

    },

    titleTextCol: {

      flex: 1,

    },

    summaryRow: {

      flexDirection: "row",

      gap: 8,

      marginBottom: 12,

      paddingHorizontal: 2,

    },

    summaryChip: {

      flex: 1,

      borderRadius: 12,

      paddingVertical: 10,

      paddingHorizontal: 8,

      alignItems: "center",

      borderWidth: 1,

      borderColor: c.border,

    },

    summaryValue: {

      fontSize: 18,

      fontWeight: "800",

      color: c.text,

      marginTop: 4,

    },

    summaryLabel: {

      fontSize: 9,

      fontWeight: "700",

      color: c.textMuted,

      marginTop: 2,

      textTransform: "uppercase",

      letterSpacing: 0.35,

    },

    body: {

      flex: 1,

    },

  });



const createStyles = participantsSheetStyles;
