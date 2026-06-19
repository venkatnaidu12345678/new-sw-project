import { Platform } from "react-native";
import TextRecognition, {
  TextRecognitionScript,
} from "@react-native-ml-kit/text-recognition";
import { ensureLocalFileUri, getImageUri, isRemoteImageUrl } from "./imageUpload";

const INDIAN_MAKERS = [
  "maruti suzuki",
  "maruti",
  "suzuki",
  "hyundai",
  "tata",
  "mahindra",
  "toyota",
  "honda",
  "kia",
  "mg",
  "ford",
  "nissan",
  "renault",
  "volkswagen",
  "bmw",
  "mercedes",
  "mercedes-benz",
  "audi",
  "skoda",
  "citroen",
  "jeep",
  "isuzu",
  "force",
  "ashok leyland",
  "bajaj",
  "hero",
  "tvs",
  "yamaha",
  "royal enfield",
  "jawa",
  "chevrolet",
  "datsun",
  "lexus",
  "volvo",
  "porsche",
  "jaguar",
  "land rover",
];

const normalizeText = (text) =>
  String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[°]/g, "0")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

const OCR_DIGIT_MAP = { O: "0", I: "1", L: "1", S: "5", B: "8", Z: "2", Q: "0", D: "0", G: "6" };

const fixOcrDigits = (value) =>
  String(value || "")
    .toUpperCase()
    .split("")
    .map((ch) => OCR_DIGIT_MAP[ch] || ch)
    .join("");

const compactText = (text) =>
  normalizeText(text).replace(/\s+/g, " ").trim().toUpperCase();

const lineList = (text) =>
  normalizeText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const parseDateParts = (day, month, year) => {
  const d = Number(day);
  const m = Number(month);
  let y = Number(year);
  if (!d || !m || !y) return null;
  if (y < 100) y += y >= 50 ? 1900 : 2000;
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const findDates = (text) => {
  const dates = [];
  const re = /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const iso = parseDateParts(match[1], match[2], match[3]);
    if (iso) dates.push({ iso, index: match.index, raw: match[0] });
  }
  return dates;
};

const findLabeledDate = (text, labels) => {
  const upper = compactText(text);
  for (const label of labels) {
    const idx = upper.indexOf(label);
    if (idx === -1) continue;
    const slice = upper.slice(idx, idx + 80);
    const match = slice.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/);
    if (match) {
      const iso = parseDateParts(match[1], match[2], match[3]);
      if (iso) return iso;
    }
  }
  return null;
};

const cleanRegNumber = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

const formatIndianRegNo = (value) => {
  const raw = cleanRegNumber(value);
  if (!raw) return "";

  const bharat = raw.match(/^(\d{2})(BH)(\d{4})([A-Z]{2})$/);
  if (bharat) return `${bharat[1]}${bharat[2]}${bharat[3]}${bharat[4]}`;

  const std = raw.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/);
  if (std) return `${std[1]}${std[2]}${std[3]}${std[4]}`;

  return raw;
};

const tryFixRegNumber = (value) => {
  const direct = formatIndianRegNo(value);
  if (direct.length >= 8 && /^[A-Z]{2}\d/.test(direct)) return direct;

  const cleaned = cleanRegNumber(value);
  const fixed = fixOcrDigits(cleaned);
  const fromFixed = formatIndianRegNo(fixed);
  if (fromFixed.length >= 8) return fromFixed;

  const loose = cleaned.match(/^([A-Z]{2})([A-Z0-9]{1,2})([A-Z]{1,3})([A-Z0-9]{3,4})$/);
  if (loose) {
    const district = fixOcrDigits(loose[2]).replace(/[^0-9]/g, "");
    const series = loose[3].replace(/[0-9]/g, "");
    const serial = fixOcrDigits(loose[4]).replace(/[^0-9]/g, "").slice(-4).padStart(4, "0");
    if (district && series && serial) {
      const attempt = formatIndianRegNo(`${loose[1]}${district}${series}${serial}`);
      if (attempt.length >= 8) return attempt;
    }
  }

  return direct;
};

const scoreRegCandidate = (value) => {
  const formatted = tryFixRegNumber(value);
  if (!formatted || formatted.length < 8) return 0;
  if (/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(formatted)) return 100;
  if (/^\d{2}BH\d{4}[A-Z]{2}$/.test(formatted)) return 95;
  return formatted.length >= 8 ? 50 : 0;
};

const collectRegCandidates = (text) => {
  const upper = compactText(text);
  const candidates = new Set();

  const labeled = [
    /REG(?:ISTRATION)?\s*(?:NO|NUMBER)?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /REGN\.?\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /VEHICLE\s*(?:NO|NUMBER)?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /RC\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /FOR\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
  ];

  for (const re of labeled) {
    const match = upper.match(re);
    if (match?.[1]) candidates.add(match[1]);
  }

  const patterns = [
    /\b\d{2}BH\d{4}[A-Z]{2}\b/g,
    /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/g,
    /\b[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}\b/g,
    /\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{3,4}\b/g,
  ];

  for (const re of patterns) {
    const matches = upper.match(re);
    if (matches) matches.forEach((m) => candidates.add(m));
  }

  for (const line of lineList(text)) {
    const lineUpper = line.toUpperCase().replace(/[^A-Z0-9\s\-]/g, " ");
    const lineMatches = lineUpper.match(
      /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b|\b\d{2}BH\d{4}[A-Z]{2}\b/g
    );
    if (lineMatches) lineMatches.forEach((m) => candidates.add(m));
  }

  return [...candidates];
};

const findIndianRegNumber = (text) => {
  const candidates = collectRegCandidates(text);
  let best = "";
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreRegCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = tryFixRegNumber(candidate);
    }
  }

  return best;
};

const cleanDlNumber = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9/\-]/g, "");

const scoreDlCandidate = (value) => {
  const cleaned = cleanDlNumber(value);
  if (!cleaned || cleaned.length < 10) return 0;
  if (/^DL\d{13,16}$/.test(cleaned)) return 100;
  if (/^[A-Z]{2}\d{2}\d{4}\d{7,}$/.test(cleaned.replace(/\//g, ""))) return 95;
  if (/^[A-Z]{2}\d{13,16}$/.test(cleaned)) return 90;
  if (/^[A-Z]{2}[-/]?\d{2}[-/]?\d{11,13}$/.test(cleaned)) return 85;
  return cleaned.length >= 12 ? 40 : 0;
};

const findValueOnNextLine = (lines, labelPatterns) => {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const upper = line.toUpperCase();
    if (!labelPatterns.some((p) => p.test(upper))) continue;

    const sameLine = line.match(/[:\s]+([A-Z0-9][A-Z0-9\s/\-]{7,24})$/i);
    if (sameLine?.[1]) return sameLine[1].trim();

    const next = lines[i + 1];
    if (next && /[A-Z0-9/\-]{10,}/i.test(next)) return next.trim();
  }
  return "";
};

const findDrivingLicenseNumber = (text) => {
  const upper = compactText(text);
  const lines = lineList(text).map((l) => l.toUpperCase());
  const candidates = new Set();

  const labeled = [
    /(?:DL|DRIVING\s*LICEN[CS]E|LICEN[CS]E)\s*(?:NO|NUMBER|#)?[:\s]*([A-Z0-9\s/\-]{8,24})/i,
    /DL\s*NO\.?[:\s]*([A-Z0-9\s/\-]{8,24})/i,
    /LICEN[CS]E\s*NO\.?[:\s]*([A-Z0-9\s/\-]{8,24})/i,
  ];

  for (const re of labeled) {
    const match = upper.match(re);
    if (match?.[1]) candidates.add(match[1]);
  }

  const fromLine = findValueOnNextLine(lineList(text), [
    /DL\s*NO/,
    /LICEN[CS]E\s*NO/,
    /DRIVING\s*LICEN/,
  ]);
  if (fromLine) candidates.add(fromLine);

  const patterns = [
    /\bDL[-\s]?\d{13,16}\b/gi,
    /\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7,}\b/g,
    /\b[A-Z]{2}\d{13,16}\b/g,
    /\b[A-Z]{2}[-/]?\d{2}[-/]?\d{11,13}\b/g,
  ];

  for (const re of patterns) {
    const matches = upper.match(re);
    if (matches) matches.forEach((m) => candidates.add(m));
  }

  for (const line of lines) {
    const dlDelhi = line.match(/\b(DL[\s\-]?\d{10,16})\b/i);
    if (dlDelhi) candidates.add(dlDelhi[1]);
    const stateFmt = line.match(/\b([A-Z]{2}[\s/\-]?\d{2}[\s/\-]?\d{4}[\s/\-]?\d{5,})\b/);
    if (stateFmt) candidates.add(stateFmt[1]);
  }

  let best = "";
  let bestScore = 0;
  for (const candidate of candidates) {
    const normalized = cleanDlNumber(fixOcrDigits(candidate));
    const score = scoreDlCandidate(normalized);
    if (score > bestScore) {
      bestScore = score;
      best = normalized;
    }
  }

  return best;
};

const findMaker = (text) => {
  const lower = normalizeText(text).toLowerCase();
  const labeled = lower.match(
    /(?:maker|manufacturer|make|mfg|company)[:\s]+([a-z][a-z0-9\s\-&.]{1,40})/i
  );
  if (labeled?.[1]) {
    const name = labeled[1].split(/\n|model|type/i)[0].trim();
    if (name.length >= 2) return titleCase(name);
  }

  for (const maker of INDIAN_MAKERS) {
    if (lower.includes(maker)) return titleCase(maker);
  }
  return "";
};

const findModel = (text) => {
  const lines = lineList(text);
  for (const line of lines) {
    const match = line.match(/(?:model|model name)[:\s]+(.+)/i);
    if (match?.[1]) {
      const model = match[1].trim().split(/\s{2,}|,/)[0];
      if (model.length >= 2 && model.length <= 40) return titleCase(model);
    }
  }

  const compact = compactText(text);
  const inline = compact.match(/MODEL[:\s]+([A-Z0-9][A-Z0-9\s\-.]{1,30})/);
  if (inline?.[1]) {
    const model = inline[1].split(/\s{2,}/)[0].trim();
    if (model.length >= 2) return titleCase(model);
  }
  return "";
};

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());

const cleanPersonName = (value) =>
  String(value || "")
    .replace(/[^a-zA-Z\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isLikelyPersonName = (value) => {
  const name = cleanPersonName(value);
  if (name.length < 3 || name.length > 50) return false;
  if (/\d/.test(name)) return false;
  const words = name.split(" ").filter(Boolean);
  return words.length >= 1 && words.length <= 6;
};

const findPersonName = (text, labels) => {
  const lines = lineList(text);
  const upper = compactText(text);

  for (const label of labels) {
    const idx = upper.indexOf(label);
    if (idx === -1) continue;
    const raw = normalizeText(text);
    const labelIdx = raw.toUpperCase().indexOf(label);
    const slice = raw.slice(labelIdx, labelIdx + 100);
    const inline = slice.match(/[:\s]+([A-Za-z][A-Za-z\s.]{2,45})/);
    if (inline?.[1] && isLikelyPersonName(inline[1])) {
      return titleCase(cleanPersonName(inline[1]));
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineUpper = line.toUpperCase();
    if (labels.some((l) => lineUpper.includes(l))) {
      const sameLine = line.match(/[:\s]+([A-Za-z][A-Za-z\s.]{2,45})$/);
      if (sameLine?.[1] && isLikelyPersonName(sameLine[1])) {
        return titleCase(cleanPersonName(sameLine[1]));
      }
      for (let j = 1; j <= 2; j += 1) {
        const next = lines[i + j];
        if (next && isLikelyPersonName(next) && !/LICEN|REGIST|CERTIF|VALID|DATE|DL\s*NO/i.test(next)) {
          return titleCase(cleanPersonName(next));
        }
      }
    }
  }

  if (labels.includes("NAME") || labels.includes("HOLDER")) {
    for (let i = 0; i < lines.length; i += 1) {
      if (/^NAME$/i.test(lines[i].trim())) {
        const next = lines[i + 1];
        if (next && isLikelyPersonName(next)) {
          return titleCase(cleanPersonName(next));
        }
      }
    }
  }

  return "";
};

const findRcDocumentNumber = (text) => {
  const upper = compactText(text);
  const patterns = [
    /(?:RC|CERT(?:IFICATE)?)\s*(?:NO|NUMBER)[:\s]*([A-Z0-9\-\/]{5,24})/i,
    /FORM\s*23[:\s]*([A-Z0-9\-\/]{5,24})/i,
  ];
  for (const re of patterns) {
    const match = upper.match(re);
    if (match?.[1]) {
      const cleaned = match[1].replace(/\s+/g, "").trim();
      if (cleaned.length >= 5) return cleaned;
    }
  }
  return "";
};

const hasRcKeywords = (text) => {
  const upper = compactText(text);
  return /REGISTRATION|CERTIFICATE|REGISTERED|OWNER|REGN|CHASSIS|MOTOR|TRANSPORT|PARIVAHAN|VAHAN/.test(
    upper
  );
};

const hasLicenseKeywords = (text) => {
  const upper = compactText(text);
  return /DRIVING|LICEN[CS]E|LICENCING|TRANSPORT|PARIVAHAN|DL\s*NO|VALID/.test(upper);
};

const strongDlMarkers = (text) => {
  const upper = compactText(text);
  return (
    /DRIVING\s*LICEN|DRIVING\s*LICENSE|INDIAN\s*UNION\s*DRIVING|UNION\s*OF\s*INDIA.*LICEN/i.test(
      upper
    ) ||
    /BLOOD\s*GROUP|CLASS\s*OF\s*VEHICLE|\bCOV\b|LICENCING\s*AUTHORITY|AUTHORISATION\s*TO\s*DRIVE/i.test(
      upper
    ) ||
    (/DL\s*NO|LICEN[CS]E\s*NO/i.test(upper) && Boolean(findDrivingLicenseNumber(text)))
  );
};

const strongRcMarkers = (text) => {
  const upper = compactText(text);
  return (
    /REGISTRATION\s*CERTIFICATE|CERTIFICATE\s*OF\s*REGISTRATION|FORM\s*23\b/i.test(upper) ||
    /CHASSIS|ENGINE\s*NO|REGISTERING\s*AUTHORITY|MANUFACTURER|HYPOTHECATION|\bNOC\b/i.test(upper) ||
    (/REGISTERED\s*OWNER|OWNER\s*NAME/i.test(upper) && Boolean(findIndianRegNumber(text)))
  );
};

/** True when OCR text is clearly from a driving licence, not an RC. */
export const looksLikeDrivingLicense = (text) => {
  if (strongDlMarkers(text)) return true;
  const dlNum = findDrivingLicenseNumber(text);
  if (!dlNum) return false;
  if (strongRcMarkers(text) && !strongDlMarkers(text)) return false;
  return hasLicenseKeywords(text) && !strongRcMarkers(text);
};

const rcOnlyKeywords = (text) => {
  const upper = compactText(text);
  return /REGISTRATION\s*CERTIFICATE|CERTIFICATE\s*OF\s*REGISTRATION|REGISTERED\s*OWNER|CHASSIS|ENGINE\s*NO|REGN\.?\s*NO|FORM\s*23|HYPOTHECATION|MANUFACTURER/i.test(
    upper
  );
};

/** True when OCR text is clearly from an RC / registration certificate. */
export const looksLikeRcBook = (text) => {
  if (looksLikeDrivingLicense(text) && !strongRcMarkers(text)) return false;
  if (strongRcMarkers(text)) return true;
  if (rcOnlyKeywords(text)) return true;

  const regNo = findIndianRegNumber(text);
  if (regNo && scoreRegCandidate(regNo) >= 90) return true;
  if (
    regNo &&
    (findMaker(text) ||
      findModel(text) ||
      findPersonName(text, ["OWNER", "REGISTERED OWNER", "NAME OF OWNER"]))
  ) {
    return true;
  }

  return false;
};

export const isDateExpired = (isoDate) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

const inferVehicleType = (text, vehicleTypeOptions = []) => {
  const upper = compactText(text);
  const rules = [
    { re: /\b(AUTO|AUTO\s*RICKSHAW|THREE\s*WHEELER|3W)\b/, value: "auto" },
    { re: /\b(M\/CYCLE|MOTOR\s*CYCLE|MOTORCYCLE|2W|SCOOTER|BIKE)\b/, value: "bike" },
    { re: /\b(LMV|CAR|MOTOR\s*CAR|LMV-NT|SUV|MUV|JEEP|HATCHBACK|HB|VAN)\b/, value: "car" },
  ];

  for (const rule of rules) {
    if (rule.re.test(upper)) {
      const option = vehicleTypeOptions.find((o) => o.value === rule.value);
      if (option) return option.value;
    }
  }

  for (const option of vehicleTypeOptions) {
    const label = String(option.label || option.value).toUpperCase();
    if (label && upper.includes(label)) return option.value;
  }

  return "";
};

export const parseDrivingLicenseText = (text) => {
  const license_number = findDrivingLicenseNumber(text);
  const driver_name =
    findPersonName(text, [
      "NAME",
      "HOLDER",
      "DRIVER NAME",
      "NAME OF HOLDER",
      "SON OF",
      "DAUGHTER OF",
      "WIFE OF",
    ]) || findPersonName(text, ["NAME"]);
  const issue_date =
    findLabeledDate(text, ["DOI", "DATE OF ISSUE", "ISSUE DATE", "ISSUED ON"]) ||
    findDates(text)[0]?.iso ||
    "";
  const expiry_date =
    findLabeledDate(text, [
      "DOE",
      "VALID TILL",
      "VALID UPTO",
      "VALID UP TO",
      "EXPIRY",
      "EXPIRES",
      "VALIDITY",
      "VALID UP TO",
    ]) ||
    findDates(text).slice(-1)[0]?.iso ||
    "";

  return {
    license_number,
    driver_name,
    issue_date,
    expiry_date,
  };
};

export const parseRcText = (text) => {
  const vehicle_number = findIndianRegNumber(text);
  return {
    car_no: vehicle_number,
    vehicle_number,
    rc_number: findRcDocumentNumber(text) || vehicle_number,
    company: findMaker(text),
    model: findModel(text),
    type: inferVehicleType(text, []),
  };
};

export const parseRcTextWithTypes = (text, vehicleTypeOptions) => ({
  ...parseRcText(text),
  type: inferVehicleType(text, vehicleTypeOptions),
});

const mergeExtracted = (current, extracted) => {
  const next = { ...current };
  for (const [key, value] of Object.entries(extracted)) {
    const v = String(value || "").trim();
    if (!v) continue;
    if (!String(next[key] || "").trim()) next[key] = v;
  }
  return next;
};

const buildOcrUriCandidates = (uri) => {
  if (!uri) return [];
  const candidates = new Set([uri]);
  if (uri.startsWith("file://")) {
    candidates.add(uri.replace("file://", ""));
  } else if (uri.startsWith("/")) {
    candidates.add(`file://${uri}`);
  }
  if (Platform.OS === "android" && uri.startsWith("file://")) {
    candidates.add(decodeURI(uri.replace("file://", "")));
  }
  return [...candidates];
};

const flattenRecognitionText = (result) => {
  const chunks = new Set();
  const add = (value) => {
    const trimmed = String(value || "").trim();
    if (trimmed) chunks.add(trimmed);
  };

  add(result?.text);

  for (const block of result?.blocks || []) {
    add(block?.text);
    for (const line of block?.lines || []) {
      add(line?.text);
      for (const element of line?.elements || []) {
        add(element?.text);
      }
    }
  }

  const lines = [...chunks];
  return {
    fullText: lines.join("\n"),
    lineText: lines.join("\n"),
  };
};

const recognizeBestEffort = async (uriCandidates, script) => {
  let best = { fullText: "", lineText: "" };

  for (const uri of uriCandidates) {
    try {
      const result = script
        ? await TextRecognition.recognize(uri, script)
        : await TextRecognition.recognize(uri);
      const flat = flattenRecognitionText(result);
      if (flat.fullText.length > best.fullText.length) {
        best = flat;
      }
      if (best.fullText.length > 80) break;
    } catch {
      // try next URI variant
    }
  }

  return best;
};

export const runOcrOnImage = async (image) => {
  const localImage = await ensureLocalFileUri(image);
  const uri = getImageUri(localImage);
  if (!uri) throw new Error("No image to scan");
  if (isRemoteImageUrl(uri)) {
    throw new Error("OCR works on newly captured photos. Re-upload the document.");
  }

  const uriCandidates = buildOcrUriCandidates(uri);

  const [latin, devanagari, defaultLatin] = await Promise.all([
    recognizeBestEffort(uriCandidates, TextRecognitionScript.LATIN),
    recognizeBestEffort(uriCandidates, TextRecognitionScript.DEVANAGARI),
    recognizeBestEffort(uriCandidates, null),
  ]);

  const parts = [latin.fullText, devanagari.fullText, defaultLatin.fullText].filter(Boolean);
  const text = [...new Set(parts.join("\n").split("\n").map((l) => l.trim()).filter(Boolean))].join(
    "\n"
  );

  if (!text) {
    throw new Error("No text found in image. Try a clearer, well-lit photo.");
  }

  return text;
};

export const scanDrivingLicenseImage = async (image) => {
  const text = await runOcrOnImage(image);
  return { text, fields: parseDrivingLicenseText(text) };
};

export const scanRcImage = async (image, vehicleTypeOptions = []) => {
  const text = await runOcrOnImage(image);
  const fields = parseRcTextWithTypes(text, vehicleTypeOptions);
  return { text, fields };
};

const MIN_DOCUMENT_TEXT_LEN = 12;

/** Verify driving licence — licence number is required; other fields are optional. */
export const verifyDrivingLicenseScan = async (image) => {
  const { text, fields } = await scanDrivingLicenseImage(image);
  const extracted = {
    license_number: fields.license_number || "",
    issue_date: fields.issue_date || "",
    expiry_date: fields.expiry_date || "",
  };

  if (text.length < MIN_DOCUMENT_TEXT_LEN) {
    return {
      ok: false,
      message: "Could not read this photo. Upload a clear image of your driving licence.",
      extracted,
    };
  }
  if (looksLikeRcBook(text) && !looksLikeDrivingLicense(text)) {
    return {
      ok: false,
      message: "This looks like an RC / registration certificate. Upload your driving licence instead.",
      extracted,
    };
  }
  if (!extracted.license_number) {
    return {
      ok: false,
      message: "Licence number not found. Make sure the licence number is clearly visible.",
      extracted,
    };
  }

  if (scoreDlCandidate(extracted.license_number) < 40) {
    return {
      ok: false,
      message: "Licence number not readable. Retake with better lighting and focus.",
      extracted,
    };
  }

  return { ok: true, fields, extracted };
};

/** Verify RC — registration / vehicle number is required; other fields are optional. */
export const verifyRcScan = async (image, vehicleTypeOptions = []) => {
  const { text, fields } = await scanRcImage(image, vehicleTypeOptions);
  const vehicle_number = fields.vehicle_number || fields.car_no || "";
  const extracted = {
    rc_number: fields.rc_number || vehicle_number,
    vehicle_number,
    company: fields.company || "",
    model: fields.model || "",
    car_no: vehicle_number,
    type: fields.type || "",
  };

  if (text.length < MIN_DOCUMENT_TEXT_LEN) {
    return {
      ok: false,
      message: "Could not read this photo. Upload a clear image of your RC book.",
      extracted,
    };
  }
  if (looksLikeDrivingLicense(text) && !looksLikeRcBook(text)) {
    return {
      ok: false,
      message: "This looks like a driving licence. Upload your RC / registration certificate instead.",
      extracted,
    };
  }
  if (!extracted.vehicle_number) {
    return {
      ok: false,
      message: "Registration number not found. Make sure the vehicle number is clearly visible.",
      extracted,
    };
  }

  if (scoreRegCandidate(extracted.vehicle_number) < 50) {
    return {
      ok: false,
      message: "Registration number not readable. Retake with better lighting and focus.",
      extracted,
    };
  }

  const regLooksValid = scoreRegCandidate(extracted.vehicle_number) >= 90;
  if (!looksLikeRcBook(text) && !regLooksValid) {
    return {
      ok: false,
      message: "This does not look like an RC. Upload a clear photo of your registration certificate.",
      extracted,
    };
  }

  return { ok: true, fields: { ...fields, car_no: vehicle_number }, extracted };
};

export const applyExtractedFields = (form, extracted) => mergeExtracted(form, extracted);

export const describeFilledFields = (before, after) => {
  const labels = {
    company: "Company",
    model: "Model",
    type: "Vehicle type",
    license_number: "Licence number",
    driver_name: "Driver name",
    owner_name: "Owner name",
    rc_number: "RC number",
    car_no: "Vehicle number",
    issue_date: "Issue date",
    expiry_date: "Expiry date",
  };

  return Object.keys(labels).filter((key) => {
    const prev = String(before[key] || "").trim();
    const next = String(after[key] || "").trim();
    return !prev && next;
  }).map((key) => labels[key]);
};
