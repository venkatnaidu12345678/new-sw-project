import { baseUrl, endPoints } from "../Config";

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

export const editVechileApi = async (token, data) => {
  try {
    const res = await fetch(baseUrl + endPoints.editVechileurl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const text = await res.text(); // get raw response
    try {
      const json = JSON.parse(text); // try to parse JSON
      return json;
    } catch {
      console.error("Server returned non-JSON response:", text);
      return { success: false, message: "Server returned invalid response" };
    }
  } catch (e) {
    console.log("Verify token error", e);
    return { success: false, message: e.message };
  }
};