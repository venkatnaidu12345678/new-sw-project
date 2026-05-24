import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { validateForm, validateLocation } from "../Utils";
import { INPUT_COLORS } from "../theme/inputTheme";

const FromToInput = forwardRef(({ fields = [] }, ref) => {
  const [dropdownState, setDropdownState] = useState({});
  const [errors, setErrors] = useState({});

  const data = [
    "Hyderabad",
    "Vijayawada",
    "Bhimavaram",
    "Visakhapatnam",
    "Bangalore",
    "Chennai",
  ];

  /* ---------------- VALIDATE SINGLE FIELD ---------------- */
  const validateField = (field) => {
    if (!field.rules) return;

    for (let rule of field.rules) {
      const errorMsg = rule(field.value);
      if (errorMsg) {
        setErrors((prev) => ({ ...prev, [field.key]: errorMsg }));
        return;
      }
    }

    setErrors((prev) => ({ ...prev, [field.key]: "" }));
  };

  /* ---------------- VALIDATE FULL FORM ---------------- */
  useImperativeHandle(ref, () => ({
    validate: () => {
      const validationErrors = validateForm(
        fields.reduce((acc, field) => {
          acc[field.key] = {
            value: field.value,
            rules:
              field.rules ||
              [(v) => validateLocation(v, field.label)],
          };
          return acc;
        }, {})
      );

      setErrors(validationErrors);
      return Object.keys(validationErrors).length === 0;
    },
  }));

  /* ---------------- SEARCH ---------------- */
  const handleSearch = useCallback((key, text, onChangeText) => {
    onChangeText(text);

    if (!text || text.trim() === "") {
      setDropdownState((prev) => ({
        ...prev,
        [key]: { show: false, data: [] },
      }));
      return;
    }

    const filtered = data.filter((item) =>
      item.toLowerCase().includes(text.toLowerCase())
    );

    setDropdownState((prev) => ({
      ...prev,
      [key]: {
        show: filtered.length > 0,
        data: filtered,
      },
    }));
  }, []);

  /* ---------------- SELECT ---------------- */
  const handleSelect = useCallback((key, item, onChangeText) => {
    onChangeText(item);

    setDropdownState((prev) => ({
      ...prev,
      [key]: { show: false, data: [] },
    }));

    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  return (
    <>
      {fields.map((field, index) => {
        const state = dropdownState[field.key] || {
          show: false,
          data: [],
        };

        const error = errors[field.key];

        return (
          <View
            key={field.key}
            style={[styles.container, { zIndex: 100 - index }]}
          >
            {/* ✅ LABEL + RED STAR */}
            <Text style={styles.label}>
              {field.label}
              {field.rules && <Text style={styles.star}> *</Text>}
            </Text>

            {/* INPUT */}
            <TextInput
              style={[
                styles.input,
                error && styles.inputError,
              ]}
              placeholder={field.placeholder}
              placeholderTextColor={INPUT_COLORS.placeholder}
              value={field.value}
              onChangeText={(text) => {
                handleSearch(field.key, text, field.onChangeText);

                if (error) {
                  setErrors((prev) => ({
                    ...prev,
                    [field.key]: "",
                  }));
                }
              }}
              onBlur={() => validateField(field)}
              onFocus={() => {
                if (state.data.length > 0) {
                  setDropdownState((prev) => ({
                    ...prev,
                    [field.key]: { ...state, show: true },
                  }));
                }
              }}
            />

            {/* ERROR */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* DROPDOWN */}
            {state.show && (
              <View style={styles.dropdownWrapper}>
                <FlatList
                  data={state.data}
                  keyExtractor={(item, index) => index.toString()}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.item}
                      onPress={() =>
                        handleSelect(
                          field.key,
                          item,
                          field.onChangeText
                        )
                      }
                    >
                      <Text style={styles.itemText}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        );
      })}
    </>
  );
});

export default FromToInput;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },

  label: {
   fontSize: 16,
    fontWeight: "600",
    color: "#0b0e13",
    marginBottom: 6,
  },

  star: {
    color: "red",
    fontWeight: "bold",
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: INPUT_COLORS.background,
    color: INPUT_COLORS.text,
    fontSize: 15,
  },

  inputError: {
    borderColor: "red",
  },

  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 6,
    marginLeft: 4,
  },

  dropdownWrapper: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    maxHeight: 150,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    elevation: 5,
    zIndex: 999,
  },

  item: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },

  itemText: {
    fontSize: 14,
    color: "#111",
  },
});