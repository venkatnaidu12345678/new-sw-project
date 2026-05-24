import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

const Loader = ({ visible }) => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!visible) return;

    let startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setTime(elapsed);
    }, 100);

    return () => {
      clearInterval(timer);
      setTime(0);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Loading... {time}s</Text>
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 14,
  },
});