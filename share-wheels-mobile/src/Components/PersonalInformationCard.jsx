import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

import { editVechileApi } from "../ApiService/AuthApiService";
import { useLookupOptions, normalizeVehicleType } from "../hooks/useLookupOptions";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

// Icons
import gender from "../assets/gender.png";
import phonenumber from "../assets/phonenumber.png";
import message from "../assets/message.png";
import ride from "../assets/ride.png";
import vehicleTypeIcon from "../assets/vechiletypeicon.png";
import licenseIcon from "../assets/licenseicon.png";
import licensePlaceholderIcon from "../assets/licenceplaceholdericon.png";
import issueExpiryIcon from "../assets/issue&expiryicon.png";
import editIcon from "../assets/editicon.png";
import vehicleInfoIcon from "../assets/caricon2.png";

const PersonalInformationCard = ({ personal, vehicle }) => {
  const { input } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { options: vehicleTypeOptions } = useLookupOptions("vehicle_type", "Select type");
  const [editingVehicle, setEditingVehicle] = useState(false);

  // Personal
  const [genderValue, setGenderValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [emailValue, setEmailValue] = useState("");

  // Vehicle
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [license, setLicense] = useState("");
  const [holder, setHolder] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Picker states
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  // Loader
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (personal) {
      setGenderValue(personal.gender || "");
      setPhoneValue(personal.phoneNumber || "");
      setEmailValue(personal.email || "");
    }

    if (vehicle) {
      setVehicleName(vehicle.vehicleCompany || "");
      setVehicleType(vehicle.vehicleType || "");
      setLicense(vehicle.licenseNumber || "");
      setHolder(vehicle.licensePlateHolder || "");
      setIssueDate(vehicle.issueDate || "");
      setExpiryDate(vehicle.expiryDate || "");
    }
  }, [personal, vehicle]);

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Date pick handlers
  const onChangeIssueDate = (event, selectedDate) => {
    setShowIssuePicker(false);
    if (selectedDate) {
      setIssueDate(selectedDate.toISOString());
    }
  };

  const onChangeExpiryDate = (event, selectedDate) => {
    setShowExpiryPicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate.toISOString());
    }
  };

  // Save Vehicle Info
  const saveVehicleInfo = async () => {
    try {
      if (new Date(expiryDate) <= new Date(issueDate)) {
        Alert.alert("Error", "Expiry date must be after issue date");
        return;
      }

      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");

      const payload = {
        company: vehicleName,
        type: vehicleType,
        license_number: license,
        car_no: holder,
        issue_date: issueDate,
        expiry_date: expiryDate,
      };

      const response = await editVechileApi(token, payload);

      if (response.success) {
        Alert.alert("Success", "Vehicle info updated successfully");
        setEditingVehicle(false);
      } else {
        Alert.alert("Error", response.message || "Failed to update vehicle info");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypeLabel =
    vehicleTypeOptions.find((o) => o.value === vehicleType)?.label || vehicleType;

  return (
    <View style={styles.container}>
      {/* PERSONAL */}
      <View style={styles.card}>
        <Text style={styles.heading}>Personal Information</Text>

        <View style={styles.row}>
          <Image source={gender} style={styles.icon} />
          <Text style={styles.value}>{genderValue}</Text>
        </View>

        <View style={styles.row}>
          <Image source={phonenumber} style={styles.icon} />
          <Text style={styles.value}>{phoneValue}</Text>
        </View>

        <View style={styles.row}>
          <Image source={ride} style={styles.icon} />
          <Text style={[styles.value, styles.userNoValue]}>
            User ID: {personal?.userNo || "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <Image source={message} style={styles.icon} />
          <Text style={styles.value}>{emailValue}</Text>
        </View>
      </View>

      {/* VEHICLE */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={vehicleInfoIcon} style={styles.vehicleHeaderIcon} />
            <Text style={styles.heading}>Vehicle Information</Text>
          </View>

          <TouchableOpacity onPress={() => setEditingVehicle(!editingVehicle)}>
            <Image source={editIcon} style={styles.editIcon} />
          </TouchableOpacity>
        </View>

        {/* Fields */}
        {[ 
          { icon: ride, value: vehicleName, setter: setVehicleName, kind: "text", placeholder: "Vehicle company" },
          { icon: licenseIcon, value: license, setter: setLicense, kind: "text", placeholder: "License number" },
          { icon: licensePlaceholderIcon, value: holder, setter: setHolder, kind: "text", placeholder: "Registration number" },
        ].map((item, index) => (
          <View style={styles.row} key={index}>
            <Image source={item.icon} style={styles.icon} />
            {editingVehicle ? (
              <TextInput
                style={styles.input}
                placeholder={item.placeholder}
                placeholderTextColor={input.placeholder}
                value={item.value}
                onChangeText={item.setter}
              />
            ) : (
              <Text style={styles.value}>{item.value}</Text>
            )}
          </View>
        ))}

        <View style={styles.row}>
          <Image source={vehicleTypeIcon} style={styles.icon} />
          {editingVehicle ? (
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={vehicleType}
                onValueChange={setVehicleType}
                style={styles.picker}
              >
                <Picker.Item label="Select vehicle type" value="" />
                {vehicleTypeOptions.map((opt) => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                ))}
              </Picker>
            </View>
          ) : (
            <Text style={styles.value}>{vehicleTypeLabel || "—"}</Text>
          )}
        </View>

        {/* Dates */}
        <View style={styles.row}>
          <Image source={issueExpiryIcon} style={styles.icon} />

          {editingVehicle ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={() => setShowIssuePicker(true)}>
                <Text style={[styles.input, { width: 110 }]}>
                  {issueDate ? formatDate(issueDate) : "Issue Date"}
                </Text>
              </TouchableOpacity>

              <Text style={{ marginHorizontal: 5 }}>-</Text>

              <TouchableOpacity onPress={() => setShowExpiryPicker(true)}>
                <Text style={[styles.input, { width: 110 }]}>
                  {expiryDate ? formatDate(expiryDate) : "Expiry Date"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.value}>
              {formatDate(issueDate)} - {formatDate(expiryDate)}
            </Text>
          )}
        </View>

        {/* SAVE BUTTON */}
        {editingVehicle && (
          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.7 }]}
            onPress={saveVehicleInfo}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={input.text} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* PICKERS */}
      {showIssuePicker && (
        <DateTimePicker
          value={issueDate ? new Date(issueDate) : new Date()}
          mode="date"
          onChange={onChangeIssueDate}
        />
      )}

      {showExpiryPicker && (
        <DateTimePicker
          value={expiryDate ? new Date(expiryDate) : new Date()}
          mode="date"
          onChange={onChangeExpiryDate}
        />
      )}
    </View>
  );
};

export default PersonalInformationCard;

const createStyles = (c) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },

  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    elevation: 6,
  },

  heading: { fontSize: 18, fontWeight: "700", marginBottom: 10, color: c.text },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  row: { flexDirection: "row", alignItems: "center", marginVertical: 10 },

  icon: { width: 30, height: 30, marginRight: 10 },

  value: { fontSize: 16, fontWeight: "600", color: c.text },
  userNoValue: { letterSpacing: 1, color: c.primary },

  input: {
    borderBottomWidth: 1,
    borderColor: c.border,
    flex: 1,
    fontSize: 16,
    color: c.text,
    paddingVertical: 4,
  },

  pickerWrap: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: c.border,
  },

  picker: {
    color: c.text,
    marginLeft: -8,
  },

  saveButton: {
    backgroundColor: c.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },

  saveText: { color: c.inverseText, textAlign: "center" },

  editIcon: { width: 20, height: 20 },

  vehicleHeaderIcon: { width: 22, height: 22, marginRight: 8 },
});