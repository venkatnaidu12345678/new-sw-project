import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";
import { AUTH_COLORS } from "../theme/authTheme";
import { LAYOUT } from "../theme/layout";

const AuthButton = ({
    type = "submit",
    onPress,
    loading = false,
    disabled = false,
    style,
}) => {

    const getLabel = () => {
        switch (type) {
            case "signin": return "Sign In";
            case "signup": return "Sign Up";
            case "save": return "Save Details";
            default: return "Submit";
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[
                styles.button,
                style,
                (disabled || loading) && styles.disabledButton,
            ]}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.buttonText}>{getLabel()}</Text>
            )}
        </TouchableOpacity>
    );
};

export default AuthButton;

const styles = StyleSheet.create({
    button: {
        backgroundColor: AUTH_COLORS.primary,
        height: LAYOUT.sizes.buttonHeight,
        borderRadius: LAYOUT.radius.md,
        alignItems: "center",
        justifyContent: "center",
        marginTop: LAYOUT.spacing.sm,
        marginBottom: LAYOUT.spacing.xs,
    },
    disabledButton: {
        backgroundColor: "#93C5FD",
    },
    buttonText: {
        color: AUTH_COLORS.white,
        fontSize: LAYOUT.font.body,
        fontWeight: "700",
    },
});
