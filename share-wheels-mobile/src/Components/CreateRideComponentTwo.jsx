// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
// } from "react-native";

// import PriceCard from "./PriceCard";
// import PassengerBottomSlider from "../Components/PassengerBottomSlider.jsx";

// const routesData = [
//   {
//     id: "1",
//     title: "Route 1",
//     desc: "Kondapur - Madhapur • 15 kms • 1 hr • No Tolls",
//     passengers: [
//       {
//         id: "p1",
//         name: "Rajesh Kumar",
//         gender: "Male",
//         stopover: "Rangareddy",
//         price: 1160,
//       },
//       {
//         id: "p2",
//         name: "Sita Devi",
//         gender: "Female",
//         stopover: "Madhapur",
//         price: 980,
//       },
//     ],
//   },
//   {
//     id: "2",
//     title: "Route 2",
//     desc: "Gachibowli - Hitech City • 10 kms • 1 hr • No Tolls",
//     passengers: `${12}`,
//   },
//   {
//     id: "3",
//     title: "Route 3",
//     desc: "Banjara Hills - Jubilee Hills • 8 kms • 1 hr • No Tolls",
//     passengers: `${0}`,
//   },
// ];

// const CreateRideComponentTwo = ({ rideData, updateRideData }) => {
//   const [selectedRoute, setSelectedRoute] = useState(null);

//   const [sliderVisible, setSliderVisible] = useState(false);
//   const [sliderData, setSliderData] = useState([]);

//   useEffect(() => {
//     if (!rideData.route) {
//       updateRideData("route", routesData[0].id);
//     }
//   }, []);

//   const handlePassengersClick = (passengers) => {
//     setSliderData(passengers);
//     setSliderVisible(true);
//   };

//   return (
//     <View style={{ flex: 1 }}>
//       <ScrollView
//         style={styles.container}
//         contentContainerStyle={styles.content}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* ROUTES */}
//         {routesData.map((item) => {
//           const isSelected = selectedRoute === item.id;

//           return (
//             <TouchableOpacity
//               key={item.id}
//               style={styles.routeRow}
//               onPress={() => setSelectedRoute(item.id)}
//             >
//               <View style={styles.radio}>
//                 {isSelected && <View style={styles.radioInner} />}
//               </View>

//               <View style={styles.contentBox}>
//                 <View style={styles.topRow}>
//                   <Text style={styles.routeTitle}>{item.title}</Text>

//                   {item.passengers.length > 0 && (
//                     <TouchableOpacity
//                       onPress={() =>
//                         handlePassengersClick(item.passengers)
//                       }
//                     >
//                       <Text style={styles.passengers}>
//                         {item.passengers.length} Passengers
//                       </Text>
//                     </TouchableOpacity>
//                   )}
//                 </View>

//                 <Text style={styles.routeDesc}>{item.desc}</Text>
//               </View>
//             </TouchableOpacity>
//           );
//         })}

//         <PriceCard />
//       </ScrollView>

//       <PassengerBottomSlider
//         visible={sliderVisible}
//         data={sliderData}
//         onClose={() => setSliderVisible(false)}
//       />
//     </View>
//   );
// };

// export default CreateRideComponentTwo;

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: "#FFFFFF",
//     marginTop: 200,
//   },
//   content: {
//     paddingHorizontal: 16,
//     paddingBottom: 40,
//   },
//   routeRow: {
//     flexDirection: "row",
//     paddingVertical: 18,
//     borderBottomWidth: 1,
//     borderColor: "#EEE",
//     alignItems: "center",
//   },
//   radio: {
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: "#9CA3AF",
//     marginRight: 14,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   radioInner: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     backgroundColor: "#2619DA",
//   },
//   contentBox: {
//     flex: 1,
//   },
//   topRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   routeTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   passengers: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#FF7A00",
//   },
//   routeDesc: {
//     fontSize: 13,
//     color: "#6B7280",
//     marginTop: 6,
//   },
// });
