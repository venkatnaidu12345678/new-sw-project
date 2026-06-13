import { getImageUri, isRemoteImageUrl } from "./imageUpload";
import {
  looksLikeDrivingLicense,
  looksLikeRcBook,
  runOcrOnImage,
} from "./vehicleDocumentOcr";

const DOCUMENT_MARKERS =
  /DRIVING|LICEN[CS]E|REGISTRATION|CERTIFICATE|REGISTERED\s*OWNER|PARIVAHAN|TRANSPORT|AADHAAR|PAN\s*CARD|INCOME\s*TAX|BANK|PASSPORT|FORM\s*23/i;

const PLATE_LIKE = /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}\b/;

const stripPlateText = (text) =>
  String(text || "").replace(PLATE_LIKE, " ").replace(/\s+/g, " ").trim();

const countMeaningfulWords = (text) =>
  stripPlateText(text)
    .toUpperCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3).length;

const countTextLines = (text) =>
  String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2).length;

/**
 * Vehicle photo must be an actual vehicle image — not documents or text screenshots.
 */
export const verifyVehicleImage = async (image) => {
  const uri = getImageUri(image);
  if (!uri) {
    return { ok: false, message: "No image selected." };
  }
  if (isRemoteImageUrl(uri)) {
    return { ok: true, skipped: true };
  }

  try {
    const text = await runOcrOnImage(image);
    const upper = String(text || "").toUpperCase();
    const withoutPlate = stripPlateText(upper);

    if (DOCUMENT_MARKERS.test(upper)) {
      return {
        ok: false,
        message:
          "This looks like a document. Upload a clear side or front photo of your vehicle.",
      };
    }

    if (looksLikeDrivingLicense(text) || looksLikeRcBook(text)) {
      return {
        ok: false,
        message:
          "This looks like a document. Upload a photo of your car or bike, not licence or RC.",
      };
    }

    const meaningfulWords = countMeaningfulWords(upper);
    const textLines = countTextLines(upper);

    if (textLines >= 3 || meaningfulWords >= 6) {
      return {
        ok: false,
        message:
          "Too much text in this image. Upload a photo of your vehicle, not a document or text image.",
      };
    }

    if (withoutPlate.length > 50) {
      return {
        ok: false,
        message:
          "This image has too much readable text. Upload a clear photo of your vehicle.",
      };
    }

    return { ok: true, method: "ocr" };
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("No text found")) {
      return { ok: true, method: "photo" };
    }
    return {
      ok: false,
      message: msg || "Could not verify this photo. Try a clearer vehicle image.",
    };
  }
};
