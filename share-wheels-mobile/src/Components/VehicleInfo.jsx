import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import ride from '../assets/ride.png';
import carimage from '../assets/nearbycar.png';

const CreateRide = () => {
  return (
    <View style={styles.card}>

      <View style={styles.left}>
        <View style={styles.parentVehicleinfo}>
          <View style={styles.caricon}>
            <Image source={ride} />
          </View>
          <View>
            <Text style={styles.owner}>Venkat’s Car</Text>
            <Text style={styles.carName}>Swift Dzire</Text>
            <Text style={styles.carInfo}>2023 ZX Executive • Sedan</Text>
          </View>
        </View>

      </View>
      <Image
        source={carimage}
        style={styles.image}
      />
    </View>
  );
};

export default CreateRide;
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F6F8FF",
    borderColor: "#DBDFFF",
    height: 150,
    width: "100%",
  },

  left: {
    flex: 1,
    width: '50%',
    height: '100%',
    position: 'relative',
  },
  parentVehicleinfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    gap: 10,
    marginLeft: 10,
  },
  owner: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 2,
  },

  carName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },

  carInfo: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },

  image: {
    width: 190,
    height: 150,
    borderRadius: 16,
  },
  caricon: {
    marginTop: -30
  }
});

