import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import AnimatedIcon from './AnimatedIcon';
import Star from '../Star';
import icon from '../../assets/icon.png';



const SMALL_ICONS = [
  { x: -50, y: -170 },
  { x: 110, y: -60 },
  { x: -110, y: 30 },
  { x: -35, y: 150 },
  { x: 130, y: 100 },

];

export const StarRender = () => {
  // ⭐ Animation values
  const star1Scale = useRef(new Animated.Value(0)).current;
  const star2Scale = useRef(new Animated.Value(0)).current;
  const star3Scale = useRef(new Animated.Value(0)).current;

  const star1Opacity = useRef(new Animated.Value(0)).current;
  const star2Opacity = useRef(new Animated.Value(0)).current;
  const star3Opacity = useRef(new Animated.Value(0)).current;
  const colorstring = "#498EFF"

  useEffect(() => {
    Animated.sequence([
      Animated.delay(2600),

      // ⭐ Step 1: star1 appears
      Animated.parallel([
        Animated.timing(star1Scale, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star1Opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),

      // ⭐ Step 2: star1 grows + star2 appears
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(star1Scale, {
          toValue: 2,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star2Scale, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star1Opacity, {
          toValue: 0.5,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star2Opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),

      // ⭐ Step 3: star1 grows more + star2 grows + star3 appears
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(star1Scale, {
          toValue: 3.7,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star2Scale, {
          toValue: 2.3,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star3Scale, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star1Opacity, {
          toValue: 0.2,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star2Opacity, {
          toValue: 0.5,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star3Opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),

      // ⭐ Delay before closing
      Animated.delay(500),

      // ⭐ Close effect: shrink + fade out
      Animated.parallel([
        Animated.timing(star1Scale, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star2Scale, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star3Scale, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star1Opacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star2Opacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(star3Opacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.starWrapper}>
      {/* STAR 1 */}
      <Animated.View
        style={[styles.layer, { opacity: star1Opacity, transform: [{ scale: star1Scale }] }]}
      >
        <Star size={200} color={colorstring} />
      </Animated.View>

      {/* STAR 2 */}
      <Animated.View
        style={[styles.layer, { opacity: star2Opacity, transform: [{ scale: star2Scale }] }]}
      >
        <Star size={200} color={colorstring} />
      </Animated.View>

      {/* STAR 3 */}
      <Animated.View
        style={[styles.layer, { opacity: star3Opacity, transform: [{ scale: star3Scale }] }]}
      >
        <Star size={200} color={colorstring} />

        {/* Floating icons */}
        {SMALL_ICONS.map((pos, i) => (
          <Animated.Image
            key={i}
            source={icon}
            style={{
              position: 'absolute',
              width: 17,
              height: 17,
              opacity: star3Opacity,
              transform: [
                { translateX: star3Scale.interpolate({ inputRange: [0, 1], outputRange: [0, pos.x] }) },
                { translateY: star3Scale.interpolate({ inputRange: [0, 1], outputRange: [0, pos.y] }) },
                { scale: star3Scale.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
              ],
            }}
            resizeMode="contain"
          />
        ))}
      </Animated.View>

      {/* Center icon */}
      <View style={styles.iconWrapper}>
        <AnimatedIcon source={icon} />
      </View>
    </View>
  );
};

export const AnimatedAppName = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-180)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(1000),

      // Move to middle
      Animated.timing(translateX, {
        toValue: 120,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      // Natural dash at stop
      Animated.spring(translateX, {
        toValue: 120,
        velocity: 300,        // dash strength
        // tension: 120,       // stiffness
        // friction: 14,       // stop quickly
        useNativeDriver: true,
      }),

      Animated.delay(2000),

      // Continue
      Animated.timing(translateX, {
        toValue: 500,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.title,
        { transform: [{ translateX }], }
      ]}
    >
      Share Wheels
    </Animated.Text>
  );
};



export const WelcomeText = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(430)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(9000),
      // Natural dash at stop
      Animated.spring(translateX, {
        toValue: 220,
        velocity: 200,        // dash strength
        tension: 50,       // stiffness
        friction: 7,    // stop quickly
        useNativeDriver: true,
      }),

    ]).start();
  }, []);



  return (
    <Animated.Text
      style={[
        styles.welcometitle,
        { transform: [{ translateX }], }
      ]}
    >
      Welcome to ShareWheels
    </Animated.Text>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  starWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIcon: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  iconWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Poppins',
    color: '#FFFFFF',
    letterSpacing: 1,
    position: 'absolute',
    bottom: 320,
    left: 0,
    right: 0,
  },
  
  welcometitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: 1,
    position: 'absolute',
    fontFamily: 'Poppins',
    bottom: 590,
    left: 0,
    right: 0,
    width: 200,
  },

  bottomtext: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    letterSpacing: 1,
    position: 'absolute',
    fontFamily: 'Poppins',
    bottom: 130,
    left: 0,
    right: 0,
    width: 350,
    textAlign: 'center',
    font: 'Poppins',
  },

  carsplash: {
    width: 400,
    height: 300,
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
  },

});
