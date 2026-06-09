const nodemailer = require("nodemailer");

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
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
    console.log(`[Email OTP] SMTP not configured. Reset code for ${recipient}: ${code}`);
    return { sent: false, devLogged: true };
  }

  await transporter.sendMail({ from, to: recipient, subject, text, html });
  return { sent: true };
}

module.exports = sendPasswordResetOtpEmail;
