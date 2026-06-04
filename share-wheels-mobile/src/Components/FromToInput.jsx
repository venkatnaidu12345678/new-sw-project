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
  StyleSheet,
  Pressable,
  Keyboard,
} from "react-native";

import { validateForm, validateLocation } from "../Utils";
import { useTheme } from "../context/ThemeContext";
import { useLocationSuggestions } from "../hooks/useLocationSuggestions";
import { getSuggestionKey, getSuggestionLabel } from "../Utils/placeSuggestions";

const BLUR_HIDE_MS = 280;

const getRouteFieldStyle = (c) => ({
  from: {
    label: { color: c.successText },
    input: { backgroundColor: c.tintGreen, borderColor: c.border },
    dot: c.successText,
  },
  to: {
    label: { color: c.warningText },
    input: { backgroundColor: c.tintOrange, borderColor: c.border },
    dot: c.warningText,
  },
});

const FromToInput = forwardRef(({ fields = [], variant, onPlaceSelect }, ref) => {
  const { input, colors } = useTheme();
  const routeFieldStyle = getRouteFieldStyle(colors);
  const isRoute = variant === "route";
  const [dropdownState, setDropdownState] = useState({});
  const [errors, setErrors] = useState({});
  const blurTimers = useRef({});
  const inputRefs = useRef({});
  const selectingRef = useRef(false);
  const { searchPlaces, resolvePlace } = useLocationSuggestions();

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

  const getFieldState = useCallback(
    (key) => {
      const raw = dropdownState[key];
      return {
        show: Boolean(raw?.show),
        data: Array.isArray(raw?.data) ? raw.data : [],
        loading: Boolean(raw?.loading),
      };
    },
    [dropdownState]
  );

  const scheduleHideDropdown = (key) => {
    clearBlurTimer(key);
    blurTimers.current[key] = setTimeout(() => {
      if (selectingRef.current) return;
      setDropdownState((prev) => {
        const current = prev[key];
        return {
          ...prev,
          [key]: {
            show: false,
            data: Array.isArray(current?.data) ? current.data : [],
            loading: false,
          },
        };
      });
    }, BLUR_HIDE_MS);
  };

  const runSearch = useCallback(
    async (key, text, onChangeText) => {
      onChangeText(text);
      clearBlurTimer(key);

      if (!text || text.trim() === "") {
        setDropdownState((prev) => ({
          ...prev,
          [key]: { show: false, data: [], loading: false },
        }));
        return;
      }

      setDropdownState((prev) => ({
        ...prev,
        [key]: { show: true, data: prev[key]?.data || [], loading: true },
      }));

      const filtered = await searchPlaces(text);
      setDropdownState((prev) => ({
        ...prev,
        [key]: {
          show: filtered.length > 0,
          data: filtered,
          loading: false,
        },
      }));
    },
    [searchPlaces]
  );

  const handleSelect = useCallback(
    async (key, item, onChangeText) => {
      selectingRef.current = true;
      clearBlurTimer(key);

      const resolved = await resolvePlace(item);
      const label = getSuggestionLabel(resolved || item);
      onChangeText(label);
      onPlaceSelect?.(key, resolved || { label });

      setDropdownState((prev) => ({
        ...prev,
        [key]: { show: false, data: [], loading: false },
      }));
      setErrors((prev) => ({ ...prev, [key]: "" }));
      inputRefs.current[key]?.blur?.();
      Keyboard.dismiss();
      setTimeout(() => {
        selectingRef.current = false;
      }, 100);
    },
    [onPlaceSelect, resolvePlace]
  );

  const renderField = (field, index) => {
    const state = getFieldState(field.key);
    const error = errors[field.key];
    const showDropdown = state.show && (state.data.length > 0 || state.loading);
    const routeStyle = isRoute ? routeFieldStyle[field.key] : null;

    return (
      <View
        key={field.key}
        style={[
          styles.container,
          isRoute && styles.routeField,
          { zIndex: 100 - index },
        ]}
      >
        <Text style={[styles.label, { color: colors.text }, routeStyle?.label]}>
          {field.label}
          {field.rules && <Text style={styles.star}> *</Text>}
        </Text>

        <TextInput
          ref={(node) => {
            if (node) inputRefs.current[field.key] = node;
          }}
          style={[
            styles.input,
            {
              backgroundColor: input.background,
              borderColor: input.border,
              color: input.text,
            },
            routeStyle?.input,
            error && styles.inputError,
          ]}
          placeholder={field.placeholder}
          placeholderTextColor={input.placeholder}
          value={field.value}
          blurOnSubmit={false}
          onChangeText={(text) => {
            runSearch(field.key, text, field.onChangeText);
            if (error) {
              setErrors((prev) => ({ ...prev, [field.key]: "" }));
            }
          }}
          onFocus={() => {
            clearBlurTimer(field.key);
            const text = String(field.value || "").trim();
            if (text.length >= 2) {
              runSearch(field.key, text, field.onChangeText);
            }
          }}
          onBlur={() => {
            scheduleHideDropdown(field.key);
            validateField(field);
          }}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {showDropdown ? (
          <View
            style={[
              styles.dropdownWrapper,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              style={styles.dropdownScroll}
            >
              {state.loading && state.data.length === 0 ? (
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Searching places…
                </Text>
              ) : null}
              {state.data.map((item, idx) => (
                <Pressable
                  key={getSuggestionKey(item, idx)}
                  style={({ pressed }) => [
                    styles.item,
                    { borderColor: colors.border },
                    pressed && { backgroundColor: colors.primaryMuted },
                  ]}
                  onPress={() =>
                    handleSelect(field.key, item, field.onChangeText)
                  }
                >
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    {getSuggestionLabel(item)}
                  </Text>
                  {item?.description ? (
                    <Text
                      style={[styles.itemSubtext, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

  if (isRoute && fields.length >= 2) {
    const fromStyle = routeFieldStyle.from;
    const toStyle = routeFieldStyle.to;
    return (
      <View style={styles.routeCard}>
        <View style={styles.routeTimeline}>
          <View style={[styles.routeDot, { backgroundColor: fromStyle.dot }]} />
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={[styles.routeDot, { backgroundColor: toStyle.dot }]} />
        </View>
        <View style={styles.routeFields}>
          {fields.map((field, index) => renderField(field, index))}
        </View>
      </View>
    );
  }

  return <>{fields.map((field, index) => renderField(field, index))}</>;
});

export default FromToInput;

const styles = StyleSheet.create({
  routeCard: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  routeTimeline: {
    width: 20,
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 28,
    marginRight: 10,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    flex: 1,
    width: 2,
    marginVertical: 6,
    borderRadius: 1,
  },
  routeFields: {
    flex: 1,
    minWidth: 0,
  },
  routeField: {
    marginBottom: 14,
  },
  container: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  star: {
    color: "red",
    fontWeight: "bold",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
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
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    zIndex: 999,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  loadingText: {
    padding: 14,
    fontSize: 13,
  },
  item: {
    padding: 14,
    borderBottomWidth: 0.5,
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
