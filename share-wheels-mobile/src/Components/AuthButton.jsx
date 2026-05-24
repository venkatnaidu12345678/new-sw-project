import React from "react";
import { TouchableOpacity, View, Text, ActivityIndicator, StyleSheet } from "react-native";

const AuthButton = ({
    type = "submit",        // signin | signup | sendCode | save | default
    onPress,
    loading = false,
    disabled = false,
    buttonColor = '#2F66F3', // default color
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
                (disabled || loading) && styles.disabledButton
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
        backgroundColor: '#2F66F3',
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 10,
    },

    disabledButton: {
        backgroundColor: '#8AA4F8',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
