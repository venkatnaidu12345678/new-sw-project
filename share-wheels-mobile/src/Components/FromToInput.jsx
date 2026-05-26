import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";

import { validateForm, validateLocation } from "../Utils";
import { INPUT_COLORS } from "../theme/inputTheme";

const BLUR_HIDE_MS = 280;

const FromToInput = forwardRef(({ fields = [] }, ref) => {
  const [dropdownState, setDropdownState] = useState({});
  const [errors, setErrors] = useState({});
  const blurTimers = useRef({});
  const selectingRef = useRef(false);

  const data = [
    "Hyderabad",
    "Vijayawada",
    "Bhimavaram",
    "Visakhapatnam",
    "Bangalore",
    "Chennai",
  ];

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

  const clearBlurTimer = (key) => {
    if (blurTimers.current[key]) {
      clearTimeout(blurTimers.current[key]);
      blurTimers.current[key] = null;
    }
  };

  const scheduleHideDropdown = (key) => {
    clearBlurTimer(key);
    blurTimers.current[key] = setTimeout(() => {
      if (selectingRef.current) return;
      setDropdownState((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), show: false },
      }));
    }, BLUR_HIDE_MS);
  };

  const handleSearch = useCallback((key, text, onChangeText) => {
    onChangeText(text);
    clearBlurTimer(key);

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

  const handleSelect = useCallback((key, item, onChangeText) => {
    selectingRef.current = true;
    clearBlurTimer(key);
    onChangeText(item);
    setDropdownState((prev) => ({
      ...prev,
      [key]: { show: false, data: [] },
    }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setTimeout(() => {
      selectingRef.current = false;
    }, 100);
  }, []);

  return (
    <>
      {fields.map((field, index) => {
        const state = dropdownState[field.key] || {
          show: false,
          data: [],
        };
        const error = errors[field.key];
        const showDropdown = state.show && state.data.length > 0;

        return (
          <View
            key={field.key}
            style={[styles.container, { zIndex: 100 - index }]}
          >
            <Text style={styles.label}>
              {field.label}
              {field.rules && <Text style={styles.star}> *</Text>}
            </Text>

            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder={field.placeholder}
              placeholderTextColor={INPUT_COLORS.placeholder}
              value={field.value}
              blurOnSubmit={false}
              onChangeText={(text) => {
                handleSearch(field.key, text, field.onChangeText);
                if (error) {
                  setErrors((prev) => ({ ...prev, [field.key]: "" }));
                }
              }}
              onFocus={() => {
                clearBlurTimer(field.key);
                if (state.data.length > 0) {
                  setDropdownState((prev) => ({
                    ...prev,
                    [field.key]: { ...state, show: true },
                  }));
                }
              }}
              onBlur={() => {
                scheduleHideDropdown(field.key);
                validateField(field);
              }}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {showDropdown ? (
              <View style={styles.dropdownWrapper}>
                <ScrollView
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="always"
                  keyboardDismissMode="none"
                  style={styles.dropdownScroll}
                >
                  {state.data.map((item, idx) => (
                    <Pressable
                      key={`${item}-${idx}`}
                      style={({ pressed }) => [
                        styles.item,
                        pressed && styles.itemPressed,
                      ]}
                      onPress={() =>
                        handleSelect(field.key, item, field.onChangeText)
                      }
                    >
                      <Text style={styles.itemText}>{item}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );
});

export default FromToInput;

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
    marginTop: 4,
    maxHeight: 160,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    zIndex: 999,
  },
  dropdownScroll: {
    maxHeight: 160,
  },
  item: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },
  itemPressed: {
    backgroundColor: "#F1F5F9",
  },
  itemText: {
    fontSize: 15,
    color: "#111",
  },
});
