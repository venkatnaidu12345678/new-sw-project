const requireFields = (fields) => (req, res, next) => {
  const missing = fields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === "");
  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }
  return next();
};

const requireLoginFields = (req, res, next) => {
  const { email, mobile, password } = req.body || {};
  if (password === undefined || password === null || password === "") {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }
  const hasEmail = email !== undefined && email !== null && String(email).trim() !== "";
  const hasMobile = mobile !== undefined && mobile !== null && String(mobile).trim() !== "";
  if (!hasEmail && !hasMobile) {
    return res.status(400).json({
      success: false,
      message: "Email or mobile is required",
    });
  }
  return next();
};

module.exports = {
  requireFields,
  requireLoginFields,
};
