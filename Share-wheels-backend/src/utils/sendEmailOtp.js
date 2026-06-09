const nodemailer = require("nodemailer");

const isProduction = () => String(process.env.NODE_ENV || "").toLowerCase() === "production";

const isSmtpConfigured = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass);
};

/** Safe status for /health — no secrets. */
const getSmtpStatus = () => {
  const configured = isSmtpConfigured();
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    configured,
    host: configured ? String(process.env.SMTP_HOST).trim() : null,
    port: configured ? port : null,
    fromSet: Boolean(process.env.SMTP_FROM || process.env.SMTP_USER),
    mode: configured ? (isProduction() ? "production" : "development") : "missing",
  };
};

function getTransporter() {
  if (!isSmtpConfigured()) return null;

  const host = String(process.env.SMTP_HOST).trim();
  const user = String(process.env.SMTP_USER).trim();
  const pass = String(process.env.SMTP_PASS).trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secureEnv = String(process.env.SMTP_SECURE || "").toLowerCase();
  const secure = secureEnv === "true" || secureEnv === "1" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && port === 587,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    tls: {
      minVersion: "TLSv1.2",
    },
  });
}

async function sendPasswordResetOtpEmail(to, otp, userName) {
  const recipient = String(to || "").trim().toLowerCase();
  const code = String(otp || "").trim();
  if (!recipient || !code) {
    throw new Error("Email recipient and OTP are required");
  }

  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@sharewheels.app";
  const subject = "Share Wheels — Password reset code";
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const text = `${greeting}

Your password reset code is: ${code}

This code expires in 5 minutes. Do not share it with anyone.

If you did not request this, you can ignore this email.

— Share Wheels`;

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <p>${greeting}</p>
      <p>Your password reset code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#2563eb;">${code}</p>
      <p>This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#64748b;font-size:14px;">If you did not request this, you can ignore this email.</p>
      <p>— Share Wheels</p>
    </div>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    if (isProduction()) {
      throw new Error("SMTP is not configured on the server");
    }
    console.log(`[Email OTP] SMTP not configured. Reset code for ${recipient}: ${code}`);
    return { sent: false, devLogged: true };
  }

  try {
    await transporter.sendMail({ from, to: recipient, subject, text, html });
    return { sent: true };
  } catch (err) {
    const detail = err?.response || err?.code || err?.message || "unknown error";
    console.error("[Email OTP] sendMail failed:", detail);
    throw new Error(typeof detail === "string" ? detail : err.message || "SMTP send failed");
  }
}

module.exports = sendPasswordResetOtpEmail;
module.exports.isSmtpConfigured = isSmtpConfigured;
module.exports.getSmtpStatus = getSmtpStatus;
