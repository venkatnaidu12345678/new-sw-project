export const EMPTY_VEHICLE_FORM = {
  company: "",
  model: "",
  type: "",
  license_number: "",
  driver_name: "",
  owner_name: "",
  rc_number: "",
  issue_date: "",
  expiry_date: "",
  car_no: "",
};

export const EMPTY_EXTRACTED_DETAILS = {
  license_number: "",
  driver_name: "",
  expiry_date: "",
  rc_number: "",
  vehicle_number: "",
  owner_name: "",
};

/** Profile API shape → vehicle form used in AddVehicleModal */
export const mapProfileToVehicleForm = (info) => {
  if (!info) return { ...EMPTY_VEHICLE_FORM };
  return {
    company: info.vehicleCompany || "",
    model: info.vehicleModel || "",
    type: info.vehicleType || "",
    license_number: info.licenseNumber || "",
    car_no: info.carNo || "",
    rc_number: info.carNo || "",
    driver_name: "",
    owner_name: info.licensePlateHolder || "",
    issue_date: info.issueDate ? String(info.issueDate).split("T")[0] : "",
    expiry_date: info.expiryDate ? String(info.expiryDate).split("T")[0] : "",
  };
};

export const mapProfileToVehicleImages = (info) => ({
  car_image: info?.carImage || null,
  license_image: info?.licenseImage || null,
  rc_image: info?.rcImage || null,
});

/** Merge profile, form, and OCR for extracted-details card — DL + RC numbers only. */
export const buildExtractedSnapshot = (
  form = {},
  ocrPatch = {},
  profileInfo = null
) => {
  const merged = { ...EMPTY_EXTRACTED_DETAILS };

  const formLayer = {
    license_number: form.license_number || "",
    vehicle_number: form.car_no || form.rc_number || "",
  };

  const profileLayer = profileInfo
    ? {
        license_number: profileInfo.licenseNumber || "",
        vehicle_number: profileInfo.carNo || "",
      }
    : {};

  const ocrLayer = {
    license_number: ocrPatch.license_number || "",
    vehicle_number: ocrPatch.vehicle_number || "",
  };

  for (const layer of [profileLayer, formLayer, ocrLayer]) {
    Object.entries(layer).forEach(([key, value]) => {
      const trimmed = String(value || "").trim();
      if (trimmed) merged[key] = trimmed;
    });
  }

  return merged;
};

/** Apply OCR onto the form. Extracted card uses numbers only; owner name is manual. */
export const applyScannedFields = (form, result = {}, documentType = "") => {
  const extracted = result.extracted || {};
  const fields = result.fields || {};
  const next = { ...form };
  const kind = String(documentType || "").toLowerCase();

  const assign = (key, value) => {
    const trimmed = String(value || "").trim();
    if (trimmed) next[key] = trimmed;
  };

  if (kind === "license" || kind === "license_image") {
    assign("license_number", extracted.license_number || fields.license_number);
    assign("issue_date", extracted.issue_date || fields.issue_date);
    assign("expiry_date", extracted.expiry_date || fields.expiry_date);
    return next;
  }

  if (kind === "rc" || kind === "rc_image") {
    const regNo =
      extracted.vehicle_number || extracted.car_no || fields.car_no || fields.vehicle_number;
    assign("rc_number", extracted.rc_number || fields.rc_number || regNo);
    assign("car_no", regNo);
    assign("company", extracted.company || fields.company);
    assign("model", extracted.model || fields.model);
    assign("type", extracted.type || fields.type);
    return next;
  }

  assign("license_number", extracted.license_number || fields.license_number);
  assign("rc_number", extracted.rc_number || fields.rc_number);
  assign("car_no", extracted.vehicle_number || extracted.car_no || fields.car_no);
  assign("company", extracted.company || fields.company);
  assign("model", extracted.model || fields.model);
  assign("type", extracted.type || fields.type);
  assign("issue_date", extracted.issue_date || fields.issue_date);
  assign("expiry_date", extracted.expiry_date || fields.expiry_date);

  return next;
};

/** OCR patch for extracted-details card — licence no. and registration no. only. */
export const patchExtractedFromScan = (result = {}, documentType = "") => {
  const extracted = result.extracted || {};
  const fields = result.fields || {};
  const patch = { ...EMPTY_EXTRACTED_DETAILS };
  const kind = String(documentType || "").toLowerCase();

  const assign = (key, value) => {
    const trimmed = String(value || "").trim();
    if (trimmed) patch[key] = trimmed;
  };

  if (kind === "license" || kind === "license_image") {
    assign("license_number", extracted.license_number || fields.license_number);
    return patch;
  }

  if (kind === "rc" || kind === "rc_image") {
    assign(
      "vehicle_number",
      extracted.vehicle_number || extracted.car_no || fields.car_no || fields.vehicle_number
    );
    return patch;
  }

  assign("license_number", extracted.license_number || fields.license_number);
  assign(
    "vehicle_number",
    extracted.vehicle_number || extracted.car_no || fields.car_no
  );

  return patch;
};

/** Backend add-vehicle response → profile vehicleInfo shape */
export const mapApiVehicleToProfileInfo = (vehicle, personalName = "") => ({
  vehicleCompany: vehicle?.company?.trim() || "",
  vehicleModel: vehicle?.model?.trim() || "",
  vehicleType: vehicle?.type?.trim() || "",
  licenseNumber: vehicle?.license_number?.trim() || "",
  carNo: vehicle?.car_no?.trim() || "",
  licensePlateHolder: vehicle?.owner_name?.trim() || personalName || "",
  issueDate: vehicle?.issue_date || null,
  expiryDate: vehicle?.expiry_date || null,
  carImage: vehicle?.car_image || "",
  licenseImage: vehicle?.license_image || "",
  rcImage: vehicle?.rc_image || "",
});
