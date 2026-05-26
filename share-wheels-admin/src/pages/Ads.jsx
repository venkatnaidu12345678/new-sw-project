import { useEffect, useState } from "react";
import {
  getAds,
  getAdsMeta,
  createAd,
  updateAd,
  deleteAd,
  uploadAdMedia,
} from "../api/client";

const PLACEMENT_LABELS = {
  home_banner: "Home — Banner",
  home_video: "Home — Video",
  home_native: "Home — Native card",
  search_results: "Search results",
  ride_history: "Ride history",
  profile: "Profile",
};

const emptyForm = {
  type: "banner",
  title: "",
  description: "",
  mediaUrl: "",
  posterUrl: "",
  ctaLabel: "Learn more",
  ctaUrl: "",
  placement: "home_banner",
  priority: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

export default function Ads() {
  const [ads, setAds] = useState([]);
  const [meta, setMeta] = useState({ types: [], placements: [] });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filterPlacement, setFilterPlacement] = useState("");

  const load = () => {
    setLoading(true);
    const params = filterPlacement ? { placement: filterPlacement } : {};
    getAds(params)
      .then((res) => setAds(res.ads || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getAdsMeta().then(setMeta).catch(() => {});
    load();
  }, []);

  useEffect(() => {
    load();
  }, [filterPlacement]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleUpload = async (e, mediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadAdMedia(file, mediaType);
      setField("mediaUrl", res.url);
      if (res.posterUrl) setField("posterUrl", res.posterUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const startEdit = (ad) => {
    setEditingId(ad._id);
    setForm({
      type: ad.type,
      title: ad.title || "",
      description: ad.description || "",
      mediaUrl: ad.mediaUrl || "",
      posterUrl: ad.posterUrl || "",
      ctaLabel: ad.ctaLabel || "Learn more",
      ctaUrl: ad.ctaUrl || "",
      placement: ad.placement,
      priority: ad.priority || 0,
      isActive: ad.isActive !== false,
      startsAt: ad.startsAt ? ad.startsAt.slice(0, 16) : "",
      endsAt: ad.endsAt ? ad.endsAt.slice(0, 16) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.mediaUrl.trim()) {
      setError("Upload or paste a media URL");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      priority: Number(form.priority) || 0,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
    };
    try {
      if (editingId) {
        await updateAd(editingId, payload);
      } else {
        await createAd(payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ad) => {
    try {
      await updateAd(ad._id, { isActive: !ad.isActive });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this ad?")) return;
    try {
      await deleteAd(id);
      if (editingId === id) resetForm();
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 style={styles.heading}>Ads Manager</h1>
      <p style={styles.sub}>
        Create banner, video, and native ads shown in the mobile app. Higher priority
        appears first.
      </p>

      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.formCard}>
        <h2 style={styles.formTitle}>{editingId ? "Edit ad" : "New ad"}</h2>
        <div style={styles.grid}>
          <label style={styles.label}>
            Type
            <select
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
              style={styles.input}
            >
              {(meta.types || ["banner", "video", "native"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Placement (where it shows in app)
            <select
              value={form.placement}
              onChange={(e) => setField("placement", e.target.value)}
              style={styles.input}
            >
              {(meta.placements || Object.keys(PLACEMENT_LABELS)).map((p) => (
                <option key={p} value={p}>
                  {PLACEMENT_LABELS[p] || p}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Priority
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Active
            <select
              value={form.isActive ? "yes" : "no"}
              onChange={(e) => setField("isActive", e.target.value === "yes")}
              style={styles.input}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>

        <label style={styles.label}>
          Title {form.type === "native" && "(required for native)"}
          <input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            style={styles.input}
            placeholder="Ad headline"
          />
        </label>

        {form.type === "native" && (
          <label style={styles.label}>
            Description
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              style={{ ...styles.input, minHeight: 72 }}
              placeholder="Short description"
            />
          </label>
        )}

        <div style={styles.uploadRow}>
          <label style={styles.label}>
            Media URL
            <input
              value={form.mediaUrl}
              onChange={(e) => setField("mediaUrl", e.target.value)}
              style={styles.input}
              placeholder="https://..."
            />
          </label>
          <div style={styles.uploadBtns}>
            <label style={styles.uploadBtn}>
              {uploading ? "Uploading…" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleUpload(e, "image")}
              />
            </label>
            {form.type === "video" && (
              <label style={styles.uploadBtn}>
                Upload video
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => handleUpload(e, "video")}
                />
              </label>
            )}
          </div>
        </div>

        {form.type === "video" && (
          <label style={styles.label}>
            Poster / thumbnail URL
            <input
              value={form.posterUrl}
              onChange={(e) => setField("posterUrl", e.target.value)}
              style={styles.input}
            />
          </label>
        )}

        <div style={styles.grid}>
          <label style={styles.label}>
            CTA label
            <input
              value={form.ctaLabel}
              onChange={(e) => setField("ctaLabel", e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            CTA link (opens in browser)
            <input
              value={form.ctaUrl}
              onChange={(e) => setField("ctaUrl", e.target.value)}
              style={styles.input}
              placeholder="https://"
            />
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.label}>
            Start (optional)
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setField("startsAt", e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            End (optional)
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setField("endsAt", e.target.value)}
              style={styles.input}
            />
          </label>
        </div>

        {form.mediaUrl && (
          <div style={styles.preview}>
            <span style={styles.previewLabel}>Preview</span>
            {form.type === "video" ? (
              <div>
                {(form.posterUrl || form.mediaUrl) && (
                  <img
                    src={form.posterUrl || form.mediaUrl}
                    alt=""
                    style={styles.previewImg}
                  />
                )}
                <a href={form.mediaUrl} target="_blank" rel="noreferrer">
                  Video file
                </a>
              </div>
            ) : (
              <img src={form.mediaUrl} alt="" style={styles.previewImg} />
            )}
          </div>
        )}

        <div style={styles.formActions}>
          <button type="submit" style={styles.btn} disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update ad" : "Create ad"}
          </button>
          {editingId && (
            <button type="button" style={styles.secondaryBtn} onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div style={styles.toolbar}>
        <select
          value={filterPlacement}
          onChange={(e) => setFilterPlacement(e.target.value)}
          style={styles.input}
        >
          <option value="">All placements</option>
          {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" style={styles.btn} onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading ads…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Placement</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Active</th>
              <th>Stats</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.length === 0 ? (
              <tr>
                <td colSpan={7}>No ads yet. Create one above.</td>
              </tr>
            ) : (
              ads.map((ad) => (
                <tr key={ad._id}>
                  <td>{ad.type}</td>
                  <td>{PLACEMENT_LABELS[ad.placement] || ad.placement}</td>
                  <td>{ad.title || "—"}</td>
                  <td>{ad.priority}</td>
                  <td>{ad.isActive ? "Yes" : "No"}</td>
                  <td>
                    {ad.impressions || 0} views · {ad.clicks || 0} clicks
                  </td>
                  <td style={styles.actions}>
                    <button type="button" style={styles.smallBtn} onClick={() => startEdit(ad)}>
                      Edit
                    </button>
                    <button type="button" style={styles.smallBtn} onClick={() => toggleActive(ad)}>
                      {ad.isActive ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      style={styles.dangerBtn}
                      onClick={() => handleDelete(ad._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#64748b", marginBottom: 24, maxWidth: 640 },
  error: { color: "#b91c1c", marginBottom: 12 },
  formCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
    maxWidth: 720,
  },
  formTitle: { fontSize: 18, fontWeight: 600, marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, marginBottom: 12 },
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 },
  uploadRow: { marginBottom: 12 },
  uploadBtns: { display: "flex", gap: 8, marginTop: 8 },
  uploadBtn: {
    display: "inline-block",
    padding: "8px 14px",
    background: "#f1f5f9",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    border: "1px solid #e2e8f0",
  },
  preview: { marginBottom: 16 },
  previewLabel: { fontSize: 12, color: "#64748b", display: "block", marginBottom: 8 },
  previewImg: { maxWidth: "100%", maxHeight: 160, borderRadius: 8, objectFit: "cover" },
  formActions: { display: "flex", gap: 12 },
  btn: {
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 20px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    cursor: "pointer",
  },
  toolbar: { display: "flex", gap: 12, marginBottom: 16, alignItems: "center" },
  actions: { display: "flex", flexWrap: "wrap", gap: 6 },
  smallBtn: {
    padding: "4px 10px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
  },
  dangerBtn: {
    padding: "4px 10px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    cursor: "pointer",
  },
};
