import { formatDisplayTime } from "./Utils/dateUtils";

/* ---------------- IMAGE UTILS ---------------- */

export const imageToBase64String = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = (error) => {
      reject(error);
    };
  });
};

export const base64ToImage = (base64String) => {
  const img = new Image();
  img.src = base64String;
  return img;
};


/* ---------------- DATE & TIME ---------------- */

const DATE_DISPLAY_OPTS = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export const formatSingleDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", DATE_DISPLAY_OPTS);
};

/** Handles ISO strings, Date values, and courier `{ startDate, endDate }` objects. */
export const formatRequestDate = (value) => {
  if (!value) return "N/A";

  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  ) {
    const start = value.startDate ?? value.start;
    const end = value.endDate ?? value.end;
    const startLabel = formatSingleDate(start);
    if (end) {
      const endLabel = formatSingleDate(end);
      if (endLabel !== "N/A" && endLabel !== startLabel) {
        return `${startLabel} – ${endLabel}`;
      }
    }
    return startLabel;
  }

  return formatSingleDate(value);
};

export const convertDate = (isoString) => {
  if (!isoString) return "";
  return formatSingleDate(isoString) === "N/A" ? "" : formatSingleDate(isoString);
};

export const convertTime = (isoString) => formatDisplayTime(isoString);


/* ---------------- VALIDATORS ---------------- */

export const validators = {
  required: (value, fieldName = "Field") => {
    if (!value) {
      return fieldName + " is required";
    } else if (value.trim() === "") {
      return fieldName + " is required";
    } else {
      return "";
    }
  },

  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      return "Email is required";
    } else if (!regex.test(value)) {
      return "Invalid email format";
    } else {
      return "";
    }
  },

  minLength: (value, length, fieldName = "Field") => {
    if (!value) {
      return fieldName + " is required";
    } else if (value.length < length) {
      return fieldName + " must be at least " + length + " characters";
    } else {
      return "";
    }
  },
};


/* ---------------- FIELD-SPECIFIC VALIDATORS ---------------- */

export const validateName = (value) => {
  let error = "";

  if (!value) {
    error = "Name is required";
  } else if (value.length < 3) {
    error = "Name must be at least 3 characters";
  }

  return error;
};

export const validatePhone = (value) => {
  let error = "";

  if (!value) {
    error = "Phone is required";
  } else if (value.length < 10) {
    error = "Phone must be 10 digits";
  } else if (value.length > 10) {
    error = "Phone cannot exceed 10 digits";
  }

  return error;
};

export const validateEmail = (value) => {
  let error = "";
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!value) {
    error = "Email is required";
  } else if (!regex.test(value)) {
    error = "Invalid email format";
  }

  return error;
};

/** True when the login field should be treated as email (not mobile). */
export const isLoginEmailIdentifier = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  return /[a-zA-Z._%+-]/.test(trimmed);
};

/** Format login identifier while typing — do not strip email letters before "@". */
export const formatLoginIdentifierInput = (value) => {
  const raw = String(value || "");
  if (raw.includes("@") || /[a-zA-Z._%+-]/.test(raw)) {
    return raw.replace(/[^\w@.%+-]/g, "");
  }
  return raw.replace(/\D/g, "").slice(0, 10);
};

export const validateEmailOrMobile = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "Email or mobile is required";

  if (isLoginEmailIdentifier(trimmed)) {
    if (!trimmed.includes("@")) return "Enter a complete email address";
    return validateEmail(trimmed);
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 10) return "Enter a valid 10-digit mobile number";
  if (!/^[6-9]/.test(digits)) return "Enter a valid Indian mobile number";

  return "";
};

/** Build login API body from a single email-or-mobile field. */
export const buildLoginPayload = (identifier, password) => {
  const trimmed = String(identifier || "").trim();
  const payload = { password };
  if (isLoginEmailIdentifier(trimmed)) {
    payload.email = trimmed.toLowerCase();
  } else {
    payload.mobile = trimmed.replace(/\D/g, "").slice(-10);
  }
  return payload;
};

export const validatePassword = (value) => {
  if (!value) return "Password is required";
  if (value.length < 6) return "Password must be at least 6 characters";
  return "";
};

export const validateConfirmPassword = (password, confirm) => {
  if (!confirm) return "Confirm your password";
  if (password !== confirm) return "Passwords do not match";
  return "";
};

export const validateGender = (value) => {
  let error = "";

  if (!value) {
    error = "Gender is required";
  }

  return error;
};
/* ---------------- GENERIC FORM VALIDATOR ---------------- */
export const validateForm = (fields) => {
  const errors = {};

  Object.keys(fields).forEach((key) => {
    const { value, rules } = fields[key];

    for (let rule of rules) {
      const error = rule(value);
      if (error) {
        errors[key] = error;
        break;
      }
    }
  });

  return errors;
};

/* ---------------- FIELD VALIDATORS ---------------- */

export const validateLocation = (value, fieldName = "Field") => {
  if (!value || value.trim() === "") {
    return `${fieldName} location is required`;
  }
  return "";
};

export const validatePlaceFromDropdown = (
  isConfirmed,
  fieldName = "Field"
) => {
  if (!isConfirmed) {
    return `Please select ${fieldName} from the suggestions list`;
  }
  return "";
};

export const validateDate = (date) => {
  if (!date) return "Date is required";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    return "Date cannot be in the past";
  }

  return "";
};
/* ---------------- FIELD VALIDATORS ---------------- */

export const validateSeats = (value) => {
  if (!value) return "Seats are required";

  const seats = parseInt(value);

  if (isNaN(seats)) {
    return "Seats must be a number";
  }

  if (seats < 1) {
    return "At least 1 seat is required";
  }

  if (seats > 6) {
    return "Maximum 6 seats allowed"; // optional limit
  }

  return "";
};
// ✅ Validate Price
export const validatePrice = (price) => {
  if (!price || price.trim() === "") {
    return "Price is required";
  }

  const numericPrice = Number(price);

  if (isNaN(numericPrice)) {
    return "Enter a valid number";
  }

  if (numericPrice <= 0) {
    return "Price must be greater than 0";
  }

  if (numericPrice < 10) {
    return "Minimum price is ₹10";
  }

  if (numericPrice > 100000) {
    return "Price is too high";
  }

  return "";
};
export const validateTime = {
  required: (value, fieldName) => {
    if (!value || value.toString().trim() === "") {
      return `${fieldName} is required`;
    }
    return "";
  },
};