const nodemailer = require("nodemailer");
const { Resend } = require("resend");

const isProduction = () => String(process.env.NODE_ENV || "").toLowerCase() === "production";

const getResendApiKey = () => String(process.env.RESEND_API_KEY || "").trim();
const getBrevoApiKey = () => String(process.env.BREVO_API_KEY || "").trim();

const isSmtpConfigured = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass);
};

const isHttpEmailConfigured = () => Boolean(getResendApiKey() || getBrevoApiKey());

const isEmailConfigured = () => isHttpEmailConfigured() || isSmtpConfigured();

const parseFromAddress = (from) => {
  const raw = String(from || "").trim();
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "Share Wheels", email: raw };
};

const isResendTestFrom = (from) => {
  const email = parseFromAddress(from).email.toLowerCase();
  return email === "onboarding@resend.dev";
};

const getResendAccountEmail = () =>
  String(process.env.RESEND_ACCOUNT_EMAIL || process.env.SMTP_USER || "")
    .trim()
    .toLowerCase();

const resolveResendFrom = () =>
  process.env.RESEND_FROM ||
  process.env.EMAIL_FROM ||
  "Share Wheels <onboarding@resend.dev>";

const resolveBrevoFrom = () =>
  process.env.BREVO_FROM ||
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "Share Wheels <sharewheels1998@gmail.com>";

const resolveSmtpFrom = () =>
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "noreply@sharewheels.app";

const isRetryableProviderError = (err) => {
  const msg = String(err?.message || err?.code || "");
  return (
    msg.includes("ETIMEDOUT") ||
    msg.includes("testing emails to your own email") ||
    msg.includes("verify a domain at resend.com")
  );
};

/** Safe status for /health — no secrets. */
const getSmtpStatus = () => {
  const resend = Boolean(getResendApiKey());
  const brevo = Boolean(getBrevoApiKey());
  const smtp = isSmtpConfigured();
  const port = Number(process.env.SMTP_PORT || 587);
  const resendFrom = resolveResendFrom();
  const resendTestMode = resend && isResendTestFrom(resendFrom);
  const canSendToAnyUser = brevo || (resend && !resendTestMode);

  let provider = "none";
  if (brevo) provider = "brevo";
  else if (resend && !resendTestMode) provider = "resend";
  else if (resend) provider = "resend-test";
  else if (smtp) provider = "smtp";

  return {
    configured: isEmailConfigured(),
    provider,
    canSendToAnyUser,
    resendTestMode,
    httpApi: resend || brevo,
    resend,
    brevo,
    smtp,
    host: smtp ? String(process.env.SMTP_HOST).trim() : null,
    port: smtp ? port : null,
    fromSet: Boolean(
      process.env.EMAIL_FROM ||
        process.env.RESEND_FROM ||
        process.env.BREVO_FROM ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER
    ),
    renderNote: !canSendToAnyUser
      ? "Resend test sender only emails sharewheels1998@gmail.com — add BREVO_API_KEY or verify a domain in Resend"
      : isProduction() && smtp && !resend && !brevo
        ? "Render free tier blocks SMTP ports 587/465 — set BREVO_API_KEY or RESEND_API_KEY"
        : null,
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

const buildResetEmail = (userName, code) => {
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

  return { subject: "Share Wheels — Password reset code", text, html };
};

async function sendViaResend({ from, to, subject, text, html }) {
  const apiKey = getResendApiKey();
  if (!apiKey) return null;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message || "Resend send failed");
  }
  return { sent: true, provider: "resend", id: data?.id };
}

async function sendViaBrevo({ from, to, subject, text, html }) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) return null;

  const sender = parseFromAddress(from);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: sender.name, email: sender.email },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `Brevo API error (${res.status})`;
    throw new Error(msg);
  }
  return { sent: true, provider: "brevo", id: data?.messageId };
}

async function sendViaSmtp({ from, to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) return null;

  await transporter.sendMail({ from, to, subject, text, html });
  return { sent: true, provider: "smtp" };
}

function buildSenderChain(recipient, emailContent) {
  const { subject, text, html } = emailContent;
  const resendFrom = resolveResendFrom();
  const brevoFrom = resolveBrevoFrom();
  const smtpFrom = resolveSmtpFrom();
  const resendTest = getResendApiKey() && isResendTestFrom(resendFrom);
  const accountEmail = getResendAccountEmail();
  const chain = [];

  // Brevo: verified sender email → any recipient (best for Render without custom domain).
  if (getBrevoApiKey()) {
    chain.push(() =>
      sendViaBrevo({ from: brevoFrom, to: recipient, subject, text, html })
    );
  }

  // Resend with verified domain → any recipient.
  if (getResendApiKey() && !resendTest) {
    chain.push(() =>
      sendViaResend({ from: resendFrom, to: recipient, subject, text, html })
    );
  }

  // Resend test sender → only the Resend account email.
  if (getResendApiKey() && resendTest && recipient === accountEmail) {
    chain.push(() =>
      sendViaResend({ from: resendFrom, to: recipient, subject, text, html })
    );
  }

  if (isSmtpConfigured()) {
    chain.push(() =>
      sendViaSmtp({ from: smtpFrom, to: recipient, subject, text, html })
    );
  }

  return chain;
}

async function sendPasswordResetOtpEmail(to, otp, userName) {
  const recipient = String(to || "").trim().toLowerCase();
  const code = String(otp || "").trim();
  if (!recipient || !code) {
    throw new Error("Email recipient and OTP are required");
  }

  const emailContent = buildResetEmail(userName, code);

  if (!isEmailConfigured()) {
    if (isProduction()) {
      throw new Error(
        "Email is not configured. Set BREVO_API_KEY or verify a domain in Resend."
      );
    }
    console.log(`[Email OTP] Email not configured. Reset code for ${recipient}: ${code}`);
    return { sent: false, devLogged: true };
  }

  const resendTest = getResendApiKey() && isResendTestFrom(resolveResendFrom());
  if (
    resendTest &&
    !getBrevoApiKey() &&
    recipient !== getResendAccountEmail()
  ) {
    throw new Error(
      "Resend test sender cannot email other users. Set BREVO_API_KEY or verify a domain at resend.com/domains"
    );
  }

  const senders = buildSenderChain(recipient, emailContent);
  let lastError = null;

  for (const attempt of senders) {
    try {
      const result = await attempt();
      if (result?.sent) return result;
    } catch (err) {
      lastError = err;
      console.error("[Email OTP] send failed:", err?.message || err?.code || err);
      if (isRetryableProviderError(err)) continue;
      throw err;
    }
  }

  if (lastError) throw lastError;
  throw new Error("Email could not be sent");
}

module.exports = sendPasswordResetOtpEmail;
module.exports.isSmtpConfigured = isEmailConfigured;
module.exports.getSmtpStatus = getSmtpStatus;
