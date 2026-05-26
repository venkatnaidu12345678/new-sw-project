/** 4-digit boarding OTP for ride check-in */
const generateBoardingOtp = () =>
  String(Math.floor(1000 + Math.random() * 9000));

const boardingOtpExpiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

module.exports = { generateBoardingOtp, boardingOtpExpiry };
