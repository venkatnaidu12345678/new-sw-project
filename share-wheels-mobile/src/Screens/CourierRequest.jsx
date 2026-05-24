import React, { useState , useRef  } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native"; // ✅ ADDED
import { validateLocation, validatePhone, validateForm, validatePrice } from "../Utils"; 
import clock from "../assets/clock2.png";
import FromToInput from "../Components/FromToInput";
import Calender from "../Components/Calender";
import FixedButton from "../Components/FixedButton";
import ImagePicker from "../Components/ImagePicker";
import { courierRequest } from "../ApiService/ridesApiServices";
import BackButton from "../Components/BackButton";
import { INPUT_COLORS } from "../theme/inputTheme";

const CourierRequest = () => {
  const navigation = useNavigation(); // ✅ ADDED
 const fromToRef = useRef();
  const [payload, setPayload] = useState({
    from: "",
    to: "",
    courier_type: "",
    what_to_deliver: "",
    courier_img: null,
    amount_will: "",
    date: "",
    timeSlot: "",

    receiver_name: "",
    receiver_mobile: "",
    receiver_alternate_mobile: "",
    receiver_address: "",
  });

  const updateRideData = (key, value) => {
    setPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const fields = [
    {
      key: "from",
      label: "From",
      placeholder: "Enter pickup location",
      value: payload.from,
      onChangeText: (text) => updateRideData("from", text),
      rules: [(v) => validateLocation(v, "From")],
      required: true,
    },
    {
      key: "to",
      label: "To",
      placeholder: "Enter drop location",
      value: payload.to,
      onChangeText: (text) => updateRideData("to", text),
      rules: [(v) => validateLocation(v, "To")],
      required: true,
    
    },
  ];

  const handleCreateRequest = async () => {
    
    // ✅ Validation
    if (!payload.from || !payload.to) {
      Alert.alert("Validation", "Pickup and drop locations are required");
      return;
    }

    if (!payload.receiver_name || !payload.receiver_mobile) {
      Alert.alert("Validation", "Receiver name and mobile required");
      return;
    }

    if (!payload.date) {
      Alert.alert("Validation", "Please select date");
      return;
    }

    if (!payload.timeSlot) {
      Alert.alert("Validation", "Please select time slot");
      return;
    }

    const priceError = validatePrice(payload.amount_will);
    if (priceError) {
      Alert.alert("Validation", priceError);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const finalPayload = {
        ...payload,
        amount_will: Number(payload.amount_will),
        date: {
          startDate: payload.date,
          endDate: null,
        },
      };

      console.log("Final Payload:", finalPayload);

      const response = await courierRequest(token, finalPayload);

      // ✅ SUCCESS ALERT WITH NAVIGATION
      Alert.alert(
        "Success",
        response?.message || "Courier request created",
        [
          {
            text: "OK",
            onPress: () => {
              // Reset form
              setPayload({
                from: "",
                to: "",
                courier_type: "",
                what_to_deliver: "",
                courier_img: null,
                amount_will: "",
                date: "",
                timeSlot: "",
                receiver_name: "",
                receiver_mobile: "",
                receiver_alternate_mobile: "",
                receiver_address: "",
              });

              // Navigate to Request screen
              navigation.navigate("Request", {
                activeTab: "courier",
              });// ⚠️ make sure this name matches your navigator
            },
          },
        ]
      );

    } catch (error) {
      console.log("Courier Request Error:", error);
      Alert.alert("Error", "Failed to create request");
    }
  };

  return (
    <View style={styles.safe}>
     
        <View style={styles.header}>
    <BackButton />
    <Text style={styles.title}>Create Courier Request</Text>
  </View>
   <ScrollView contentContainerStyle={styles.container}>

        {/* FROM / TO */}
         <View style={styles.card}>
          
          <FromToInput ref={fromToRef} fields={fields} />
        </View>

        {/* DATE */}
        <View style={styles.card}>
         
           <Text style={styles.label}>Date</Text>
            
          <Calender
            rideData={payload}
            updateRideData={updateRideData}
          />
        </View>
        

        {/* TIME SLOT */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Image source={clock} style={styles.smallIcon} />
            <Text style={styles.label}>Time Slot</Text>
          </View>

          <View style={styles.pickerBox}>
            <Picker
              selectedValue={payload.timeSlot}
              style={styles.picker}
              onValueChange={(v) => updateRideData("timeSlot", v)}
            >
              <Picker.Item label="Select Time Slot" value="" />
              <Picker.Item label="Morning" value="morning" />
              <Picker.Item label="Afternoon" value="afternoon" />
              <Picker.Item label="Evening" value="evening" />
            </Picker>
          </View>
        </View>

        {/* COURIER TYPE */}
        <View style={styles.card}>
          <Text style={styles.label}>Courier Type</Text>

          <View style={styles.pickerBox}>
            <Picker
              selectedValue={payload.courier_type}
              style={styles.picker}
              onValueChange={(v) =>
                updateRideData("courier_type", v)
              }
            >
              <Picker.Item label="Select Type" value="" />
              <Picker.Item label="Document" value="document" />
              <Picker.Item label="Parcel" value="parcel" />
              <Picker.Item label="Package" value="package" />
            </Picker>
          </View>
        </View>

        {/* IMAGE */}
        <View style={styles.card}>
          <ImagePicker
            type="courier"
            onChange={(img) =>
              updateRideData("courier_img", img)
            }
          />
        </View>

        {/* DESCRIPTION */}
        <View style={styles.card}>
          <Text style={styles.label}>What To Deliver</Text>

          <TextInput
            placeholder="Enter courier details"
            placeholderTextColor={INPUT_COLORS.placeholder}
            multiline
            numberOfLines={4}
            style={[styles.descriptionInput, { color: INPUT_COLORS.text }]}
            value={payload.what_to_deliver}
            onChangeText={(text) =>
              updateRideData("what_to_deliver", text)
            }
          />
        </View>

        {/* AMOUNT */}
        <View style={styles.card}>
          <Text style={styles.label}>Amount</Text>

          <TextInput
            placeholder="Enter amount"
            placeholderTextColor={INPUT_COLORS.placeholder}
            keyboardType="numeric"
            style={styles.input}
            value={payload.amount_will}
            onChangeText={(text) =>
              updateRideData("amount_will", text.replace(/[^0-9]/g, ""))
            }
          />
        </View>

        {/* RECEIVER DETAILS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Receiver Details
          </Text>

          <TextInput
            placeholder="Receiver full name"
            placeholderTextColor={INPUT_COLORS.placeholder}
            style={styles.input}
            value={payload.receiver_name}
            onChangeText={(text) =>
              updateRideData("receiver_name", text)
            }
          />

          <TextInput
            placeholder="Receiver mobile (10 digits)"
            placeholderTextColor={INPUT_COLORS.placeholder}
            keyboardType="phone-pad"
            style={styles.input}
            value={payload.receiver_mobile}
            onChangeText={(text) =>
              updateRideData("receiver_mobile", text)
            }
          />

          <TextInput
            placeholder="Alternate mobile (required)"
            placeholderTextColor={INPUT_COLORS.placeholder}
            keyboardType="phone-pad"
            style={styles.input}
            value={payload.receiver_alternate_mobile}
            onChangeText={(text) =>
              updateRideData(
                "receiver_alternate_mobile",
                text
              )
            }
          />

          <TextInput
            placeholder="Full delivery address"
            placeholderTextColor={INPUT_COLORS.placeholder}
            multiline
            numberOfLines={3}
            style={styles.descriptionInput}
            value={payload.receiver_address}
            onChangeText={(text) =>
              updateRideData("receiver_address", text)
            }
          />
        </View>
      </ScrollView>

      <FixedButton title="Create" onPress={handleCreateRequest} />
    </View>
  );
};

export default CourierRequest;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingTop:20,
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  header: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 10,
  paddingVertical: 12,
  backgroundColor: "#fff",
  elevation: 2,
},

title: {
  fontSize: 20,
  fontWeight: "700",
  marginLeft: 10,
  color: "#111827",
},
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
  },
  smallIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: INPUT_COLORS.background,
    color: INPUT_COLORS.text,
    fontSize: 15,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    marginBottom: 12,
    backgroundColor: INPUT_COLORS.background,
    color: INPUT_COLORS.text,
    fontSize: 15,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
  },
  picker: {
    height: 90,
    width: "100%",
  },
});