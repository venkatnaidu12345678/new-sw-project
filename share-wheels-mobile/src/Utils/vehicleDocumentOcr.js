import TextRecognition, {
  TextRecognitionScript,
} from "@react-native-ml-kit/text-recognition";
import { getImageUri, isRemoteImageUrl } from "./imageUpload";

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
    .replace(/[°]/g, "0");

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

const findIndianRegNumber = (text) => {
  const upper = compactText(text);

  const labeled = [
    /REG(?:ISTRATION)?\s*(?:NO|NUMBER)?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /REGN\.?\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /VEHICLE\s*(?:NO|NUMBER)?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /RC\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
  ];

  for (const re of labeled) {
    const match = upper.match(re);
    if (match?.[1]) {
      const formatted = formatIndianRegNo(match[1]);
      if (formatted.length >= 6) return formatted;
    }
  }

  const candidates = upper.match(
    /\b\d{2}BH\d{4}[A-Z]{2}\b|\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}\b/g
  );
  if (candidates?.length) {
    const sorted = [...candidates].sort((a, b) => cleanRegNumber(b).length - cleanRegNumber(a).length);
    return formatIndianRegNo(sorted[0]);
  }

  return "";
};

const findDrivingLicenseNumber = (text) => {
  const upper = compactText(text);
  const lines = lineList(text).map((l) => l.toUpperCase());

  const labeled = [
    /(?:DL|DRIVING\s*LICEN[CS]E|LICEN[CS]E)\s*(?:NO|NUMBER|#)?[:\s]*([A-Z0-9\s\/\-\.]{8,24})/i,
    /DL\s*NO\.?[:\s]*([A-Z0-9\s\/\-\.]{8,24})/i,
  ];

  for (const re of labeled) {
    const match = upper.match(re);
    if (match?.[1]) {
      const cleaned = match[1].replace(/\s+/g, " ").trim();
      if (cleaned.length >= 8) return cleaned;
    }
  }

  for (const line of lines) {
    if (/LICEN|LICENSE|DL\s*NO/i.test(line)) {
      const tail = line.split(/[:\s]/).pop();
      if (tail && /[A-Z0-9\/\-]{8,}/.test(tail)) return tail.replace(/\s+/g, "");
    }
    const dlDelhi = line.match(/\b(DL[\s\-]?\d{10,16})\b/i);
    if (dlDelhi) return dlDelhi[1].replace(/\s+/g, "");
    const stateFmt = line.match(/\b([A-Z]{2}[\s\/\-]?\d{2}[\s\/\-]?\d{4}[\s\/\-]?\d{5,})\b/);
    if (stateFmt) return stateFmt[1].replace(/\s+/g, "");
  }

  const fallback = upper.match(/\b([A-Z]{2}[\s\-]?\d{2}[\s\-]?\d{11,15})\b/);
  if (fallback) return fallback[1].replace(/\s+/g, "");

  return "";
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
  return words.length >= 2 && words.length <= 5;
};

const findPersonName = (text, labels) => {
  const lines = lineList(text);
  const upper = compactText(text);

  for (const label of labels) {
    const idx = upper.indexOf(label);
    if (idx === -1) continue;
    const slice = normalizeText(text).slice(
      normalizeText(text).toUpperCase().indexOf(label),
      normalizeText(text).toUpperCase().indexOf(label) + 80
    );
    const inline = slice.match(/[:\s]+([A-Za-z][A-Za-z\s.]{2,45})/);
    if (inline?.[1] && isLikelyPersonName(inline[1])) {
      return titleCase(cleanPersonName(inline[1]));
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (labels.some((l) => line.toUpperCase().includes(l))) {
      const sameLine = line.match(/[:\s]+([A-Za-z][A-Za-z\s.]{2,45})$/);
      if (sameLine?.[1] && isLikelyPersonName(sameLine[1])) {
        return titleCase(cleanPersonName(sameLine[1]));
      }
      const next = lines[i + 1];
      if (next && isLikelyPersonName(next)) {
        return titleCase(cleanPersonName(next));
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
  if (looksLikeDrivingLicense(text)) return false;
  if (strongRcMarkers(text)) return true;
  if (rcOnlyKeywords(text)) return true;
  const regNo = findIndianRegNumber(text);
  if (!regNo) return false;
  return Boolean(findMaker(text)) && Boolean(findModel(text));
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
  const driver_name = findPersonName(text, [
    "NAME",
    "HOLDER",
    "DRIVER NAME",
    "NAME OF HOLDER",
  ]);
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
    owner_name: findPersonName(text, [
      "OWNER",
      "REGISTERED OWNER",
      "NAME OF OWNER",
      "HOLDER",
      "SON",
      "DAUGHTER",
      "WIFE",
    ]),
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

const recognizeWithScript = async (uri, script) => {
  try {
    const result = await TextRecognition.recognize(uri, script);
    return String(result?.text || "").trim();
  } catch {
    return "";
  }
};

export const runOcrOnImage = async (image) => {
  const uri = getImageUri(image);
  if (!uri) throw new Error("No image to scan");
  if (isRemoteImageUrl(uri)) {
    throw new Error("OCR works on newly captured photos. Re-upload the document.");
  }

  const latin = await recognizeWithScript(uri, TextRecognitionScript.LATIN);
  const devanagari = await recognizeWithScript(
    uri,
    TextRecognitionScript.DEVANAGARI
  );
  const text = [latin, devanagari].filter(Boolean).join("\n").trim();

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
    driver_name: fields.driver_name || "",
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

  return { ok: true, fields, extracted };
};

/** Verify RC — registration / vehicle number is required; other fields are optional. */
export const verifyRcScan = async (image, vehicleTypeOptions = []) => {
  const { text, fields } = await scanRcImage(image, vehicleTypeOptions);
  const vehicle_number = fields.vehicle_number || fields.car_no || "";
  const extracted = {
    rc_number: fields.rc_number || vehicle_number,
    vehicle_number,
    owner_name: fields.owner_name || "",
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
  if (looksLikeDrivingLicense(text)) {
    return {
      ok: false,
      message: "This looks like a driving licence. Upload your RC / registration certificate instead.",
      extracted,
    };
  }
  if (!looksLikeRcBook(text)) {
    return {
      ok: false,
      message: "This does not look like an RC. Upload a clear photo of your registration certificate.",
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
