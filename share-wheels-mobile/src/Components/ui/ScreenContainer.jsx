import React from "react";

import { View, StyleSheet, Platform } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";



/**

 * Full-height screen shell with safe areas (status bar + nav bar on Samsung/Android).

 */

const ScreenContainer = ({

  children,

  style,

  edges = ["top", "bottom"],

  backgroundColor,

}) => {

  const insets = useSafeAreaInsets();

  const { colors } = useTheme();

  const bg = backgroundColor ?? colors.background;



  return (

    <View

      style={[

        styles.root,

        { backgroundColor: bg },

        edges.includes("top") && { paddingTop: insets.top },

        edges.includes("bottom") && {

          paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 4 : 0),

        },

        style,

      ]}

    >

      {children}

    </View>

  );

};



const styles = StyleSheet.create({

  root: {

    flex: 1,

    width: "100%",

  },

});



export default ScreenContainer;

