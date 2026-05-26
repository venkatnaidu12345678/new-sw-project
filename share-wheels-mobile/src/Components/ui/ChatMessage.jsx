import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { MOTION } from "../../theme/motion";

const ChatMessage = ({ item, index = 0 }) => {
  const isUser = item.sender === "user";
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(isUser ? 10 : 14)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const delay = Math.min(index * 40, 200);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        delay,
        easing: MOTION.fadeIn.easing,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        ...MOTION.spring,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, isUser, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.inner, isUser ? styles.userInner : styles.botInner]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            item.escalate && styles.escalateBubble,
          ]}
        >
          <Text style={[styles.msgText, isUser && styles.userMsgText]}>
            {item.text}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default ChatMessage;

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginVertical: 4,
  },
  inner: {
    maxWidth: "88%",
  },
  userInner: {
    alignSelf: "flex-end",
  },
  botInner: {
    alignSelf: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 5,
  },
  botBubble: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  escalateBubble: {
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#0F172A",
  },
  userMsgText: {
    color: "#FFFFFF",
  },
});
