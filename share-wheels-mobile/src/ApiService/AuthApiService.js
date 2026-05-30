import { baseUrl, endPoints, getApiConnectionHint } from "../Config";
import { parseApiResponse } from "../Utils/parseApiResponse";
import { getApiErrorMessage, apiFail } from "../Utils/apiErrors";
import { appendImageFile } from "../Utils/imageUpload";

async function authRequest(path, { method = "POST", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(baseUrl + path, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    const hint = __DEV__ ? `\n\n${getApiConnectionHint()}` : "";
    return apiFail(`Could not reach the server at ${baseUrl}.${hint}`);
  }

  let data;
  try {
    data = await parseApiResponse(response);
  } catch (e) {
    return apiFail(e.message || "Invalid server response");
  }

  if (!response.ok) {
    return {
      success: false,
      ...(data && typeof data === "object" ? data : {}),
      message: getApiErrorMessage(data, `Request failed (${response.status})`),
    };
  }

  if (data && data.success === false) {
    return {
      success: false,
      ...data,
      message: getApiErrorMessage(data, "Request failed"),
    };
  }

  return { success: true, ...data };
}

export const signupApi = (data) => authRequest(endPoints.signup, { body: data });

export const loginApi = (data) => authRequest(endPoints.login, { body: data });

export const verifyOtpApi = (data) => authRequest(endPoints.verifyOtp, { body: data });

export const verifyTokenApi = (token) =>
  authRequest(endPoints.verifyToken, { method: "POST", token });

export const registerFcmTokenApi = async (token, fcmToken) => {
  const result = await authRequest(endPoints.registerFcmTokenurl, {
    body: { fcmToken },
    token,
  });
  return result;
};

export const userTermsApi = async (token, isAccepted) => {
  if (!token) return apiFail("Session expired. Please sign in again.");
  if (typeof isAccepted !== "boolean") {
    return apiFail("Invalid terms acceptance value");
  }
  return authRequest(endPoints.userTermsurl, {
    method: "PUT",
    body: { isAccepted },
    token,
  });
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

    const parsed = await parseApiResponse(res);
    if (!res.ok) {
      return apiFail(getApiErrorMessage(parsed, "Failed to update vehicle"));
    }
    return { success: true, ...parsed };
  } catch (e) {
    return apiFail(e.message || "Failed to update vehicle");
  }
};
