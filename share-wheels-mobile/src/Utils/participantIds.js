/** Safe id for navigation params — rejects touch events and non-serializable values. */
export function normalizeNavigationParamId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "function") return null;
  if (typeof value === "object") {
    if ("nativeEvent" in value || "currentTarget" in value) return null;
    const nested = value._id ?? value.id;
    if (nested != null && typeof nested !== "object") {
      return String(nested);
    }
    return null;
  }
  const id = String(value).trim();
  return id && id !== "[object Object]" ? id : null;
}

/** Stable user id from an embedded ride passenger/courier item. */
export function getParticipantUserId(item) {
  const u = item?.userId ?? item?.user;
  if (u == null) return null;
  if (typeof u === "string") return u;
  const id = u._id ?? u.id;
  return id != null ? String(id) : null;
}

/** 6-digit boarding user number from populated userId. */
export function getParticipantUserNo(item) {
  const u = item?.userId ?? item?.user;
  if (!u || typeof u !== "object") return "";
  const no = u.userNo ?? u.user_no;
  return no != null ? String(no).trim() : "";
}
