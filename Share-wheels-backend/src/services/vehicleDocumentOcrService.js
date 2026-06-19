const googleVisionService = require("./googleVisionService");
const {
  verifyDrivingLicenseText,
  verifyRcText,
} = require("../utils/vehicleDocumentParser");

const normalizeDocumentType = (value) => {
  const t = String(value || "").trim().toLowerCase();
  if (t === "license" || t === "licence" || t === "dl" || t === "license_image") {
    return "license";
  }
  if (t === "rc" || t === "registration" || t === "rc_image") {
    return "rc";
  }
  return "";
};

const scanDocumentBuffer = async (buffer, documentType, mimeType) => {
  const kind = normalizeDocumentType(documentType);
  if (!kind) {
    return {
      status: 400,
      body: {
        success: false,
        ok: false,
        message: 'documentType must be "license" or "rc"',
        code: "INVALID_DOCUMENT_TYPE",
      },
    };
  }

  if (!googleVisionService.isVisionConfigured()) {
    return {
      status: 503,
      body: {
        success: false,
        ok: false,
        message:
          "Server OCR is not configured. Set GOOGLE_VISION_API_KEY or enable Vision API on GOOGLE_MAPS_API_KEY.",
        code: "OCR_NOT_CONFIGURED",
      },
    };
  }

  let text = "";
  try {
    const result = await googleVisionService.detectTextFromBuffer(buffer, mimeType);
    text = result.text || "";
  } catch (err) {
    return {
      status: 502,
      body: {
        success: false,
        ok: false,
        message: err?.message || "OCR failed. Try a clearer photo.",
        code: "OCR_FAILED",
      },
    };
  }

  const verification =
    kind === "license" ? verifyDrivingLicenseText(text) : verifyRcText(text);

  return {
    status: 200,
    body: {
      success: true,
      ok: verification.ok,
      message: verification.ok
        ? kind === "license"
          ? "Driving licence verified"
          : "RC verified"
        : verification.message,
      documentType: kind,
      source: "google_vision",
      extracted: verification.extracted,
      fields: verification.fields,
    },
  };
};

module.exports = {
  scanDocumentBuffer,
  isOcrConfigured: googleVisionService.isVisionConfigured,
};
