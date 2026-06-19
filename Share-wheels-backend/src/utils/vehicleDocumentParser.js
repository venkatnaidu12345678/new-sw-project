const { ALLOWED_VEHICLE_TYPES, normalizeAllowedVehicleType } = require("../constants/vehicleTypes");

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
  "mercedes-benz",
  "mercedes",
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
];

const OCR_DIGIT_MAP = { O: "0", I: "1", L: "1", S: "5", B: "8", Z: "2", Q: "0", D: "0", G: "6" };

const normalizeText = (text) =>
  String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[°]/g, "0")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

const fixOcrDigits = (value) =>
  String(value || "")
    .toUpperCase()
    .split("")
    .map((ch) => OCR_DIGIT_MAP[ch] || ch)
    .join("");

const compactText = (text) => normalizeText(text).replace(/\s+/g, " ").trim().toUpperCase();

const lineList = (text) =>
  normalizeText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());

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
    /REG(?:ISTRATION)?\s*(?:NO|NUMBER|MARK)?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /REGN\.?\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /REGD\.?\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /REG\.?\s*MARK[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /REGISTRATION\s*MARK[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /VEHICLE\s*(?:NO|NUMBER|REG)?[:\s]*([A-Z0-9\s\-]{6,20})/i,
    /RC\s*NO\.?[:\s]*([A-Z0-9\s\-]{6,20})/i,
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
    const onlyPlate = lineUpper.trim();
    if (/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}$/.test(onlyPlate)) {
      candidates.add(onlyPlate);
    }
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
  if (/^[A-Z]{2}\d{13,16}$/.test(cleaned)) return 90;
  return cleaned.length >= 12 ? 40 : 0;
};

const findDrivingLicenseNumber = (text) => {
  const upper = compactText(text);
  const candidates = new Set();

  const labeled = [
    /(?:DL|DRIVING\s*LICEN[CS]E|LICEN[CS]E)\s*(?:NO|NUMBER|#)?[:\s]*([A-Z0-9\s/\-]{8,24})/i,
    /DL\s*NO\.?[:\s]*([A-Z0-9\s/\-]{8,24})/i,
  ];

  for (const re of labeled) {
    const match = upper.match(re);
    if (match?.[1]) candidates.add(match[1]);
  }

  const patterns = [
    /\bDL[-\s]?\d{13,16}\b/gi,
    /\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7,}\b/g,
    /\b[A-Z]{2}\d{13,16}\b/g,
  ];

  for (const re of patterns) {
    const matches = upper.match(re);
    if (matches) matches.forEach((m) => candidates.add(m));
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
    if (labels.some((l) => line.toUpperCase().includes(l))) {
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

  return "";
};

const findLabeledValue = (text, labelPatterns, valuePattern = /[:\s]+([A-Za-z0-9][A-Za-z0-9\s.\-/]{1,40})/) => {
  const lines = lineList(text);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!labelPatterns.some((p) => p.test(line))) continue;
    const sameLine = line.match(valuePattern);
    if (sameLine?.[1]) {
      const val = sameLine[1].trim().split(/\s{2,}|,/)[0];
      if (val.length >= 2) return titleCase(val);
    }
    const next = lines[i + 1];
    if (next && next.trim().length >= 2 && next.trim().length <= 40) {
      return titleCase(next.trim().split(/\s{2,}|,/)[0]);
    }
  }
  return "";
};

const findMaker = (text) => {
  const fromLabel = findLabeledValue(text, [
    /MAKERS?\s*NAME/i,
    /MANUFACTURER/i,
    /NAME\s*OF\s*MANUFACTURER/i,
    /MAKE/i,
    /MFG/i,
  ]);
  if (fromLabel && fromLabel.length >= 2) return fromLabel;

  const lower = normalizeText(text).toLowerCase();
  for (const maker of INDIAN_MAKERS) {
    if (lower.includes(maker)) return titleCase(maker);
  }
  return "";
};

const findModel = (text) => {
  const fromLabel = findLabeledValue(text, [
    /MODEL\s*(?:\/\s*CLASS|NAME)?/i,
    /CLASS\s*OF\s*VEHICLE/i,
  ]);
  if (fromLabel && fromLabel.length >= 2 && fromLabel.length <= 40) return fromLabel;

  const compact = compactText(text);
  const inline = compact.match(/MODEL[:\s]+([A-Z0-9][A-Z0-9\s\-.]{1,30})/);
  if (inline?.[1]) {
    const model = inline[1].split(/\s{2,}/)[0].trim();
    if (model.length >= 2) return titleCase(model);
  }
  return "";
};

const findRcDocumentNumber = (text) => {
  const upper = compactText(text);
  const patterns = [
    /(?:RC|CERT(?:IFICATE)?)\s*(?:NO|NUMBER)[:\s]*([A-Z0-9\-/]{5,24})/i,
    /FORM\s*23[:\s]*([A-Z0-9\-/]{5,24})/i,
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

const strongDlMarkers = (text) => {
  const upper = compactText(text);
  return (
    /DRIVING\s*LICEN|INDIAN\s*UNION\s*DRIVING|BLOOD\s*GROUP|CLASS\s*OF\s*VEHICLE|\bCOV\b/i.test(
      upper
    ) ||
    (/DL\s*NO|LICEN[CS]E\s*NO/i.test(upper) && Boolean(findDrivingLicenseNumber(text)))
  );
};

const strongRcMarkers = (text) => {
  const upper = compactText(text);
  return (
    /REGISTRATION\s*CERTIFICATE|CERTIFICATE\s*OF\s*REGISTRATION|FORM\s*23\b/i.test(upper) ||
    /CHASSIS|ENGINE\s*NO|REGISTERING\s*AUTHORITY|HYPOTHECATION/i.test(upper) ||
    (/REGISTERED\s*OWNER|OWNER\s*NAME|MAKERS?\s*NAME/i.test(upper) &&
      Boolean(findIndianRegNumber(text)))
  );
};

const looksLikeDrivingLicense = (text) => {
  if (strongDlMarkers(text)) return true;
  const dlNum = findDrivingLicenseNumber(text);
  if (!dlNum) return false;
  if (strongRcMarkers(text) && !strongDlMarkers(text)) return false;
  return /DRIVING|LICEN[CS]E|DL\s*NO|VALID/i.test(compactText(text)) && !strongRcMarkers(text);
};

const looksLikeRcBook = (text) => {
  if (looksLikeDrivingLicense(text) && !strongRcMarkers(text)) return false;
  if (strongRcMarkers(text)) return true;

  const upper = compactText(text);
  if (
    /REGISTRATION|CERTIFICATE|REGISTERED|OWNER|REGN|CHASSIS|MOTOR|TRANSPORT|PARIVAHAN|VAHAN|MAKERS?\s*NAME|ENGINE\s*NO/i.test(
      upper
    )
  ) {
    return true;
  }

  const regNo = findIndianRegNumber(text);
  if (regNo && scoreRegCandidate(regNo) >= 90) return true;
  if (regNo && (findMaker(text) || findModel(text) || findPersonName(text, ["OWNER", "REGISTERED OWNER"]))) {
    return true;
  }

  return false;
};

const inferVehicleType = (text) => {
  const upper = compactText(text);
  const rules = [
    { re: /\b(AUTO|AUTO\s*RICKSHAW|THREE\s*WHEELER|3W)\b/, value: "auto" },
    { re: /\b(M\/CYCLE|MOTOR\s*CYCLE|MOTORCYCLE|2W|SCOOTER|BIKE)\b/, value: "bike" },
    { re: /\b(LMV|CAR|MOTOR\s*CAR|LMV-NT|SUV|MUV|JEEP|HATCHBACK|HB|VAN)\b/, value: "car" },
  ];

  for (const rule of rules) {
    if (rule.re.test(upper) && ALLOWED_VEHICLE_TYPES.includes(rule.value)) {
      return rule.value;
    }
  }
  return "";
};

const parseDrivingLicenseText = (text) => ({
  license_number: findDrivingLicenseNumber(text),
  driver_name:
    findPersonName(text, ["NAME", "HOLDER", "DRIVER NAME", "SON OF", "WIFE OF"]) ||
    findPersonName(text, ["NAME"]),
  issue_date: "",
  expiry_date: "",
});

const parseRcText = (text) => {
  const vehicle_number = findIndianRegNumber(text);
  const type = inferVehicleType(text);
  return {
    car_no: vehicle_number,
    vehicle_number,
    rc_number: findRcDocumentNumber(text) || vehicle_number,
    company: findMaker(text),
    model: findModel(text),
    type: normalizeAllowedVehicleType(type) || type,
  };
};

const MIN_DOCUMENT_TEXT_LEN = 12;

const verifyDrivingLicenseText = (text) => {
  const fields = parseDrivingLicenseText(text);
  const extracted = {
    license_number: fields.license_number || "",
    driver_name: fields.driver_name || "",
    issue_date: "",
    expiry_date: "",
  };

  if (text.length < MIN_DOCUMENT_TEXT_LEN) {
    return { ok: false, message: "Could not read this photo. Upload a clear driving licence image.", extracted, fields };
  }
  if (looksLikeRcBook(text) && !looksLikeDrivingLicense(text)) {
    return {
      ok: false,
      message: "This looks like an RC. Upload your driving licence instead.",
      extracted,
      fields,
    };
  }
  if (!extracted.license_number) {
    return { ok: false, message: "Licence number not found.", extracted, fields };
  }
  if (scoreDlCandidate(extracted.license_number) < 40) {
    return { ok: false, message: "Licence number not readable. Retake the photo.", extracted, fields };
  }

  return { ok: true, fields, extracted };
};

const verifyRcText = (text) => {
  const fields = parseRcText(text);
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
    return { ok: false, message: "Could not read this photo. Upload a clear RC image.", extracted, fields };
  }

  if (looksLikeDrivingLicense(text) && !looksLikeRcBook(text)) {
    return {
      ok: false,
      message: "This looks like a driving licence. Upload your RC instead.",
      extracted,
      fields,
    };
  }

  if (!extracted.vehicle_number) {
    return {
      ok: false,
      message: "Registration number not found. Make sure the vehicle number is clearly visible.",
      extracted,
      fields,
    };
  }

  const regScore = scoreRegCandidate(extracted.vehicle_number);
  if (regScore < 50) {
    return {
      ok: false,
      message: "Registration number not readable. Retake with better lighting.",
      extracted,
      fields,
    };
  }

  if (!looksLikeRcBook(text) && regScore < 70) {
    return {
      ok: false,
      message: "This does not look like an RC. Upload your registration certificate.",
      extracted,
      fields,
    };
  }

  return {
    ok: true,
    fields: { ...fields, car_no: vehicle_number },
    extracted,
  };
};

module.exports = {
  parseDrivingLicenseText,
  parseRcText,
  verifyDrivingLicenseText,
  verifyRcText,
  looksLikeDrivingLicense,
  looksLikeRcBook,
  findIndianRegNumber,
  scoreRegCandidate,
};
