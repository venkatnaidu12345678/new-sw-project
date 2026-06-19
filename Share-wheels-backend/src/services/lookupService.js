const LookupOption = require("../models/lookupOptionModel");
const { LOOKUP_CATEGORIES } = require("../models/lookupOptionModel");
const { DEFAULT_LOOKUP_TYPES } = require("../constants/defaultLookupTypes");
const { ALLOWED_VEHICLE_TYPES } = require("../constants/vehicleTypes");

const normalizeLabel = (label) => String(label || "").trim();
const slugFromLabel = (label) =>
  normalizeLabel(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const isValidCategory = (category) => LOOKUP_CATEGORIES.includes(category);

const listActiveByCategory = async (category) => {
  if (!isValidCategory(category)) {
    return {
      status: 400,
      body: { success: false, message: "Invalid category" },
    };
  }
  const types = await LookupOption.find({ category, isActive: true })
    .sort({ sortOrder: 1, label: 1 })
    .select("label value")
    .lean();
  const mapped = types.map((t) => ({ label: t.label, value: t.value }));
  const fallback = DEFAULT_LOOKUP_TYPES[category] || [];
  return {
    status: 200,
    body: {
      success: true,
      category,
      types: mapped.length > 0 ? mapped : fallback,
    },
  };
};

const listByCategory = async (category) => {
  if (!isValidCategory(category)) {
    return {
      status: 400,
      body: { success: false, message: "Invalid category" },
    };
  }
  const types = await LookupOption.find({ category })
    .sort({ sortOrder: 1, label: 1 })
    .lean();
  const filtered =
    category === "vehicle_type"
      ? types.filter((t) => ALLOWED_VEHICLE_TYPES.includes(String(t.value || "").toLowerCase()))
      : types;
  return {
    status: 200,
    body: { success: true, category, types: filtered },
  };
};

const listAll = async () => {
  const types = await LookupOption.find()
    .sort({ category: 1, sortOrder: 1, label: 1 })
    .lean();
  return { status: 200, body: { success: true, types } };
};

const createOption = async (body) => {
  const category = String(body?.category || "").trim();
  const label = normalizeLabel(body?.label);
  const value = String(body?.value || slugFromLabel(label)).trim().toLowerCase();

  if (!isValidCategory(category)) {
    return { status: 400, body: { success: false, message: "Invalid category" } };
  }
  if (category === "vehicle_type" && !ALLOWED_VEHICLE_TYPES.includes(value)) {
    return {
      status: 400,
      body: {
        success: false,
        message: `Only these vehicle types are supported: ${ALLOWED_VEHICLE_TYPES.join(", ")}`,
      },
    };
  }
  if (!label || !value) {
    return {
      status: 400,
      body: { success: false, message: "Label and value are required" },
    };
  }

  const existing = await LookupOption.findOne({ category, value });
  if (existing) {
    existing.label = label;
    existing.isActive = body?.isActive !== false;
    if (body?.sortOrder !== undefined) {
      existing.sortOrder = Number(body.sortOrder) || 0;
    }
    await existing.save();
    return {
      status: 200,
      body: { success: true, type: existing, updated: true },
    };
  }

  const maxOrder = await LookupOption.findOne({ category })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  const type = await LookupOption.create({
    category,
    label,
    value,
    isActive: body?.isActive !== false,
    sortOrder:
      body?.sortOrder !== undefined
        ? Number(body.sortOrder) || 0
        : (maxOrder?.sortOrder ?? 0) + 1,
  });
  return { status: 201, body: { success: true, type, created: true } };
};

const updateOption = async (id, body) => {
  const type = await LookupOption.findById(id);
  if (!type) {
    return { status: 404, body: { success: false, message: "Option not found" } };
  }
  if (body?.label !== undefined) {
    const label = normalizeLabel(body.label);
    if (!label) {
      return { status: 400, body: { success: false, message: "Label cannot be empty" } };
    }
    type.label = label;
  }
  if (body?.value !== undefined) {
    const value = String(body.value).trim().toLowerCase();
    if (!value) {
      return { status: 400, body: { success: false, message: "Value cannot be empty" } };
    }
    const duplicate = await LookupOption.findOne({
      _id: { $ne: id },
      category: type.category,
      value,
    });
    if (duplicate) {
      return { status: 409, body: { success: false, message: "Value already exists" } };
    }
    type.value = value;
  }
  if (body?.isActive !== undefined) type.isActive = !!body.isActive;
  if (body?.sortOrder !== undefined) type.sortOrder = Number(body.sortOrder) || 0;
  await type.save();
  return { status: 200, body: { success: true, type } };
};

const deleteOption = async (id) => {
  const type = await LookupOption.findByIdAndDelete(id);
  if (!type) {
    return { status: 404, body: { success: false, message: "Option not found" } };
  }
  return { status: 200, body: { success: true, message: "Option deleted" } };
};

const bulkUpsert = async (category, items = []) => {
  if (!isValidCategory(category)) {
    return { status: 400, body: { success: false, message: "Invalid category" } };
  }
  const cleaned = items
    .map((item) => {
      const label = normalizeLabel(item?.label ?? item);
      const value = String(item?.value || slugFromLabel(label)).trim().toLowerCase();
      return label && value ? { label, value } : null;
    })
    .filter(Boolean);

  if (!cleaned.length) {
    return {
      status: 400,
      body: { success: false, message: "Provide at least one option" },
    };
  }

  const maxOrderDoc = await LookupOption.findOne({ category })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  let nextOrder = (maxOrderDoc?.sortOrder ?? 0) + 1;

  let created = 0;
  let updated = 0;

  for (const { label, value } of cleaned) {
    const existing = await LookupOption.findOne({ category, value });
    if (existing) {
      existing.label = label;
      existing.isActive = true;
      await existing.save();
      updated += 1;
    } else {
      await LookupOption.create({
        category,
        label,
        value,
        isActive: true,
        sortOrder: nextOrder,
      });
      nextOrder += 1;
      created += 1;
    }
  }

  const result = await listByCategory(category);
  return {
    status: 200,
    body: {
      success: true,
      message: `Added ${created}, updated ${updated}.`,
      created,
      updated,
      ...result.body,
    },
  };
};

module.exports = {
  listActiveByCategory,
  listByCategory,
  listAll,
  createOption,
  updateOption,
  deleteOption,
  bulkUpsert,
  LOOKUP_CATEGORIES,
};
