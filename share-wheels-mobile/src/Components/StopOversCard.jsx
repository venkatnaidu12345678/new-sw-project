// import React, { useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
// import BottomSlider from "./BottomSlider";
// import PriceCard from "./PriceCard";

// const stopovers = [
//   { name: "Madhapur" },
//   { name: "Rangareddy" },
//   { name: "Kondapur" },
//   { name: "Hafeezpet" },
//   { name: "Ameerpet" },
// ];

// const StopoversCard = () => {
//   const [selectedStopover, setSelectedStopover] = useState(null);
//   const [showSlider, setShowSlider] = useState(false);

//   const openSlider = (stopName) => {
//     setSelectedStopover(stopName);
//     setShowSlider(true);
//   };

//   return (
//     <>
//       <View style={styles.container}>
//         <Text style={styles.title}>Add Stopovers</Text>

//         {stopovers.map((stop) => (
//           <View key={stop.name} style={styles.radioContainer}>
//             <Text style={styles.stopText}>{stop.name}</Text>

//             <TouchableOpacity onPress={() => openSlider(stop.name)}>
//               <Text style={styles.priceText}>Set Price</Text>
//             </TouchableOpacity>
//           </View>
//         ))}
//       </View>

//       {/* Bottom Slider */}
//       <BottomSlider
//         visible={showSlider}
//         onClose={() => setShowSlider(false)}
//       >
//         <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 10 }}>
//           Set Price for {selectedStopover}
//         </Text>

//         {/* PriceCard INSIDE SLIDER */}
//         <PriceCard />

//       </BottomSlider>
//     </>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     margin: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 10,
//     backgroundColor: "#fff",
//   },
//   title: {
//     fontSize: 16,
//     fontWeight: "bold",
//     marginBottom: 15,
//   },
//   radioContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 12,
//   },
//   stopText: {
//     fontSize: 14,
//     color: "#555",
//   },
//   priceText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#4A90E2",
//   },
// });

// export default StopoversCard;