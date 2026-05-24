const axios = require("axios");

const sendOtp = async (mobile, otp) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        message: `Your OTP is ${otp}. Do not share this with anyone.`,
        numbers: mobile,
        flash: 0,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    throw new Error("Failed to send OTP");
  }
};

module.exports = sendOtp;
