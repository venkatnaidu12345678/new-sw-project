import { baseUrl, endPoints } from "../Config";
import { parseApiResponse } from "../Utils/parseApiResponse";
import { appendImageFile } from "../Utils/imageUpload";

export const signupApi = async (data) => {
  try {
    const res = await fetch(baseUrl + endPoints.signup, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e) {
    console.log("Signup error", e);
  }
};

export const loginApi = async (data) => {
  try {
    const res = await fetch(baseUrl + endPoints.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e) {
    console.log("Login error", e);
  }
};

export const registerFcmTokenApi = async (token, fcmToken) => {
  const res = await fetch(baseUrl + "/auth/register-fcm-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fcmToken }),
  });
  return parseApiResponse(res);
};

export const verifyOtpApi = async (data) => {
  try {
    const res = await fetch(baseUrl + endPoints.verifyOtp, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e) {
    console.log("OTP error", e);
  }
};


export const verifyTokenApi = async (token) => {
  try {
    const res = await fetch(baseUrl + endPoints.verifyToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ Bearer token
      },
    });

    return await res.json();
  } catch (e) {
    console.log("Verify token error", e);
  }
};

export const userTermsApi = async (token, isAccepted) => {
  try {
    if (!token) throw new Error("Token is missing");
    if (typeof isAccepted !== "boolean") throw new Error("isAccepted must be true or false");

    const response = await fetch(baseUrl + endPoints.userTermsurl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isAccepted }),
    });


    if (response.success == false) {
      throw new Error(data.message || "Failed to update terms");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("User Terms API Error 👉", error.message);
    return { success: false, message: error.message };
  }
};

export const editVechileApi = async (token, data, imageFiles = {}) => {
  try {
    const formData = new FormData();
    const fields = [
      "company",
      "model",
      "type",
      "license_number",
      "car_no",
      "issue_date",
      "expiry_date",
    ];
    fields.forEach((key) => {
      const val = data[key];
      if (val != null && String(val).trim() !== "") {
        formData.append(key, String(val).trim());
      }
    });
    appendImageFile(formData, "car_image", imageFiles.car_image);
    appendImageFile(formData, "license_image", imageFiles.license_image);
    appendImageFile(formData, "rc_image", imageFiles.rc_image);

    const res = await fetch(baseUrl + endPoints.editVechileurl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    return await parseApiResponse(res);
  } catch (e) {
    return { success: false, message: e.message };
  }
};