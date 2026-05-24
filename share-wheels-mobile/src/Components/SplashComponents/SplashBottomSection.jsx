import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import car from '../../assets/splashcar.png';

const SplashBottomSection = () => {
  const navigation = useNavigation();

  const textTranslateX = useRef(new Animated.Value(-400)).current;
  const carOpacity = useRef(new Animated.Value(0)).current;
  const carTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(9000),
      Animated.parallel([
        Animated.spring(textTranslateX, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(carOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(carTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <>
      <Animated.Text
        style={[
          styles.bottomtext,
          { transform: [{ translateX: textTranslateX }] },
        ]}
      >
        Connect with travelers on your route. Offer rides to earn or find rides to save.
        Everyone wins on every journey.
      </Animated.Text>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => navigation.replace('Signin')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

      <Animated.Image
        source={car}
        resizeMode="contain"
        style={[
          styles.carsplash,
          {
            opacity: carOpacity,
            transform: [{ translateY: carTranslateY }],
          },
        ]}
      />
    </>
  );
};

export default SplashBottomSection;


const styles = StyleSheet.create({
  bottomtext: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: 0.5,
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    width: 350,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  carsplash: {
    width: 400,
    height: 300,
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
  },
  button: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'Poppins',
  },
});


