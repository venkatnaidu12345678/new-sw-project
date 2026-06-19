const axios = require("axios");

const getVisionApiKey = () =>
  process.env.GOOGLE_VISION_API_KEY?.trim() ||
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  "";

const isVisionConfigured = () => Boolean(getVisionApiKey());

const flattenVisionResponse = (response) => {
  const first = response?.responses?.[0];
  if (!first) return "";

  const full = first.fullTextAnnotation?.text;
  if (full && String(full).trim()) return String(full).trim();

  const blocks = first.textAnnotations || [];
  if (blocks.length > 0 && blocks[0]?.description) {
    return String(blocks[0].description).trim();
  }

  return "";
};

/**
 * Run Google Cloud Vision OCR on an image buffer (DOCUMENT_TEXT_DETECTION + TEXT_DETECTION).
 */
const detectTextFromBuffer = async (buffer, mimeType = "image/jpeg") => {
  const key = getVisionApiKey();
  if (!key) {
    throw new Error(
      "Google Vision OCR is not configured. Set GOOGLE_VISION_API_KEY or GOOGLE_MAPS_API_KEY with Vision API enabled."
    );
  }
  if (!buffer?.length) {
    throw new Error("No image data to scan");
  }

  const base64 = Buffer.isBuffer(buffer) ? buffer.toString("base64") : Buffer.from(buffer).toString("base64");

  const { data } = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
    {
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
            { type: "TEXT_DETECTION", maxResults: 1 },
          ],
          imageContext: {
            languageHints: ["en", "hi"],
          },
        },
      ],
    },
    {
      timeout: 45000,
      headers: { "Content-Type": "application/json" },
    }
  );

  const err = data?.responses?.[0]?.error;
  if (err?.message) {
    throw new Error(err.message);
  }

  const text = flattenVisionResponse(data);
  if (!text) {
    throw new Error("No text found in image. Try a clearer, well-lit photo.");
  }

  return { text, mimeType };
};

/**
 * Fetch remote image URL and OCR (for admin/debug — optional).
 */
const detectTextFromUrl = async (imageUrl) => {
  const key = getVisionApiKey();
  if (!key) {
    throw new Error("Google Vision OCR is not configured.");
  }

  const { data } = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
    {
      requests: [
        {
          image: { source: { imageUri: String(imageUrl).trim() } },
          features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          imageContext: { languageHints: ["en", "hi"] },
        },
      ],
    },
    { timeout: 45000 }
  );

  const text = flattenVisionResponse(data);
  if (!text) throw new Error("No text found in image.");
  return { text };
};

module.exports = {
  isVisionConfigured,
  detectTextFromBuffer,
  detectTextFromUrl,
};
