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

export const convertDate = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const convertTime = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};


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