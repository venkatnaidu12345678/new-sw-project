import { baseUrl, endPoints } from '../Config';
import { parseApiResponse } from '../Utils/parseApiResponse';
import { appendImageFile, ensureCloudinaryUrl } from '../Utils/imageUpload';
import { apiRequest } from '../Utils/apiRequest';
import { getApiErrorMessage } from '../Utils/apiErrors';

export const getUpcomingRides = async (token) => {
  return apiRequest(`${baseUrl}${endPoints.upcomingRideurl}`, { token });
};

export const createRideApi = async (token, rideData) => {
  try {
    console.log("token", token);

    const response = await fetch(`${baseUrl}${endPoints.createRideurl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.message || "Failed to create ride",
      };
    }

    return {
      success: true,
      data: data,
    };

  } catch (error) {
    console.log("API ERROR:", error);

    return {
      success: false,
      message: error.message || "Something went wrong",
    };
  }
};

export const driveracceptspassengerrequest = async (token, rideData) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.driveracceptspassengerrequesturl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API ERROR:", error.message);
    throw error;
  }
};

export const acceptCourier = async (token, rideData) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.acceptCourierurl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to accept Courier");
    }

    return data;
  } catch (error) {

    throw error;
  }
};

export const driverrejectpassengerrequest = async (token, rideData) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.driverrejectpassengerrequesturl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });


    const data = await response.json();

    console.log("Status Code:", response.status);
    console.log("Backend Response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Failed to accept passenger");
    }

    return data;
  } catch (error) {
    console.error("API ERROR:", error.message);
    throw error;
  }
};
export const driverrejectcourierrequest = async (token, rideData) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.driverrejectcourierrequesturl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });


    const data = await response.json();

    console.log("Status Code:", response.status);
    console.log("Backend Response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Failed to accept ");
    }

    return data;
  } catch (error) {
    console.error("API ERROR:", error.message);
    throw error;
  }
};

export const removepassenger = async (token, rideData) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.removepassengerurl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });

    const data = await response.json();

    console.log("Remove Passenger Status:", response.status);
    console.log("Remove Passenger Response:", data);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to remove passenger");
    }

    return data;
  } catch (error) {
    console.error("Remove Passenger API Error:", error.message);
    throw error;
  }
};

// export const removeCourier = async (token, rideData) => {
//   try {
//     const response = await fetch(`${baseUrl}${endPoints.removeCourierurl}`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(rideData),
//     });

//     const data = await response.json();

//     console.log("Remove Courier Status:", response.status);
//     console.log("Remove Courier Response:", data);

//     if (!response.ok) {
//       throw new Error(data?.message || "Failed to remove Courier");
//     }

//     return data;
//   } catch (error) {
//     console.error("Remove Passenger API Error:", error.message);
//     throw error;
//   }
// };


export const removeCourier = async (token, rideData) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.removeCourierurl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to accept Courier");
    }

    return data;
  } catch (error) {

    throw error;
  }
};


export const listVerificationParticipants = async (token, rideId) => {
  const response = await fetch(
    `${baseUrl}${endPoints.verificationParticipantsurl}/${rideId}/verification/participants`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to load verification list");
  }
  return data;
};

export const verifyBoardingParticipant = async (token, rideId, payload) => {
  const response = await fetch(
    `${baseUrl}${endPoints.verifyParticipanturl}/${rideId}/verification/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Verification failed");
  }
  return data;
};

export const startride = async (token, rideData) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.startrideurl}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rideData),
    });

    const data = await response.json();

    console.log("Start Ride Status:", response.status);
    console.log("Start Ride Response:", data);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to start ride");
    }

    return data;
  } catch (error) {
    throw error;
  }
};
export const courierRequest = async (token, rideData) => {
  try {
    let courier_img = rideData.courier_img;
    if (courier_img) {
      courier_img = await ensureCloudinaryUrl(token, courier_img, "couriers");
    }

    const response = await fetch(
      `${baseUrl}${endPoints.courierRequesturl}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...rideData, courier_img }),
      }
    );

    const data = await parseApiResponse(response);

    console.log("Create Courier Request Status:", response.status);
    console.log("Create Courier Request Response:", data);

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || "Failed to create courier request"
      );
    }

    return data;

  } catch (error) {

    throw error;
  }
};

export const getAllRides = async (token, filters = {}) => {
  const { from, to, date } = filters;

  try {
    const queryParams = new URLSearchParams();
    if (from) queryParams.append("from", from);
    if (to) queryParams.append("to", to);
    if (date) queryParams.append("date", date);

    const response = await fetch(`${baseUrl}${endPoints.getallridesurl}?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    console.log("All Rides Status:", data);

    if (!response.ok) {
      throw new Error(data?.message || `Error ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error("Get All Rides API Error:", err.message);
    throw err;
  }
};

export const createpassengerrequest = async (token, payload) => {
  try {
    const response = await fetch(
      `${baseUrl}${endPoints.createpassengerrequesturl}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();
    const result = text ? JSON.parse(text) : {};

    console.log("Passenger Request Status:", response.status);
    console.log("Passenger Request Response:", result);

    if (!response.ok) {
      throw new Error(
        result?.error || result?.message || "Failed to create passenger request"
      );
    }

    return result;

  } catch (error) {
    console.error("Passenger Request API Error:", error.message);
    throw error;
  }
};
// ApiService/ridesApiServices.js

export const enrouteRequest = async (token, payload) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.enrouteRequesturl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let result = null;

    try {
      result = await response.json();
    } catch (err) {
      console.log("⚠️ Response not JSON");
    }

    console.log("✅ STATUS:", response.status);
    console.log("✅ RESPONSE:", result);

    if (!response.ok) {
      return {
        success: false,
        message:
          result?.message || result?.error || "Something went wrong",
      };
    }

    return {
      success: true,
      requests: result?.requests || result?.data || [],
    };
  } catch (error) {
    console.log("❌ API ERROR:", error);
    return {
      success: false,
      message: "Network error",
    };
  }
};
export const endRide = async (token, payload) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.endRideurl}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let result;

    try {
      result = await response.json();
    } catch (err) {
      console.log("End Ride Response is not JSON");
      result = {};
    }

    console.log("End Ride Status:", response.status);
    console.log("End Ride Response:", result);

    if (!response.ok) {
      throw new Error(
        result?.error || result?.message || "Failed to end ride"
      );
    }

    return result;

  } catch (error) {
    console.error("End Ride API Error:", error);
    throw error;
  }
};
export const rideHistory = async (token) => {
  return apiRequest(`${baseUrl}${endPoints.rideHistoryurl}`, { token });
};
export const userProfile = async (token) => {
  if (!token) {
    throw new Error("Authentication token missing");
  }

  try {
    const response = await fetch(`${baseUrl}${endPoints.userProfileurl}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    let result = {};

    try {
      result = await response.json();
    } catch (err) {
      console.log("User Profile response is not JSON");
    }

    console.log("User Profile Status:", response.status);
    console.log("User Profile Data:", result);

    // ✅ handle API-level failure
    if (!response.ok || result?.status === false) {
      throw new Error(
        result?.message || result?.error || "Failed to fetch user profile"
      );
    }

    return result;

  } catch (error) {
    console.error("User Profile API Error:", error.message);

    // ✅ return clean error (optional pattern)
    throw {
      message: error.message || "Something went wrong",
    };
  }
};

export const updateRideSeats = async (token, { rideId, totalSeats }) => {
  try {
    const response = await fetch(`${baseUrl}${endPoints.updateRideSeatsurl}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rideId, totalSeats }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to update seats");
    }
    return data;
  } catch (error) {
    throw new Error(error.message || "Failed to update seats");
  }
};

export const rideDetails = async (token, rideId) => {
  try {
    const response = await fetch(
      `${baseUrl}${endPoints.rideDetailsurl}/${rideId}`, // ✅ safe
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    console.log("Ride Details Status:", response.status);
    console.log("Ride Details Data:", result);

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || "Failed to fetch ride details");
    }

    return result;

  } catch (err) {
    console.log("FULL ERROR 👉", err);
    throw err; // ✅ must
  }
};
export const pickPassengerCourier = async (token, payload) => {
  try {
    const response = await fetch(
      `${baseUrl}${endPoints.pickPassengerCourierurl}`,
      {
        method: "POST", // ✅ FIXED
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload), // ✅ IMPORTANT
      }
    );

    const result = await response.json();

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || "Pick failed");
    }

    return result;

  } catch (err) {

    throw err;
  }
};

export const getMyRequests = async (token) => {
  try {
    const response = await fetch(
      `${baseUrl}${endPoints.getMyRequestsurl}`,
      {
        method: "GET", // ✅ FIXED
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || "Failed to fetch requests");
    }

    return result;
  } catch (err) {
    throw err;
  }
};

export const AddVehicle = async (token, vehicleData, imageFiles = {}) => {
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
      const val = vehicleData[key];
      if (val != null && String(val).trim() !== "") {
        formData.append(key, String(val).trim());
      }
    });

    appendImageFile(formData, "car_image", imageFiles.car_image);
    appendImageFile(formData, "license_image", imageFiles.license_image);
    appendImageFile(formData, "rc_image", imageFiles.rc_image);

    const response = await fetch(`${baseUrl}${endPoints.AddVechileurl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || data?.error || "Failed to add vehicle",
      };
    }

    return {
      success: true,
      message: data?.message,
      vehicle: data?.vehicle,
    };
  } catch (err) {
    return { success: false, message: err.message || "Network error" };
  }
};


// ✅ PICK COURIER
export const pickCourierApi = async (token, payload) => {
  try {
    const res = await fetch(`${baseUrl}${endPoints.pickupCourierurl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {

      return { success: false, message: "Invalid server response" };
    }
  } catch (error) {
    console.log("Pick Courier API Error:", error);
    return { success: false, message: error.message };
  }
};

// ✅ PICK PASSENGER (create this route in backend if not exists)
export const pickPassengerApi = async (token, payload) => {
  try {
    const res = await fetch(
      `${baseUrl}${endPoints.pickupPassengerurl}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json(); // ✅ parse response

    console.log("🎯 Passenger API Response:", data);

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Request failed",
      };
    }

    return data; // ✅ return API response
  } catch (error) {
    console.log("❌ Passenger API Error:", error);

    return {
      success: false,
      message: "Network error",
    };
  }
};
export const passengerSendRequestApi = async (token, payload) => {
  try {
    const data = await apiRequest(`${baseUrl}${endPoints.passengerSendRequesturl}`, {
      token,
      method: "POST",
      body: {
        ...payload,
        requires_seats: Number(payload?.requires_seats) || 1,
      },
    });
    return { success: true, ...data };
  } catch (error) {
    return {
      success: false,
      message: getApiErrorMessage(error, "Could not send booking request"),
    };
  }
};
export const courierSendRequestApi = async (token, payload) => {
  try {
    let courier_img = payload.courier_img;
    if (courier_img) {
      courier_img = await ensureCloudinaryUrl(token, courier_img, "couriers");
    }

    const res = await fetch(
      `${baseUrl}${endPoints.courierSendRequesturl}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...payload, courier_img }),
      }
    );

    const data = await parseApiResponse(res);

    console.log("📦 Courier API Response:", data);

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Request failed",
      };
    }

    return {
      success: true,
      ...data,
    };
  } catch (error) {
    console.log("❌ Courier API Error:", error);

    return {
      success: false,
      message: "Network error. Please try again.",
    };
  }
};