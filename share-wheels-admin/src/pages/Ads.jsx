import { useEffect, useState } from "react";
import {
  getAds,
  getAdsMeta,
  createAd,
  updateAd,
  deleteAd,
  uploadAdMedia,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

const PLACEMENT_LABELS = {
  home_banner: "Home - Banner",
  home_video: "Home - Video",
  home_native: "Home - Native card",
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

const isLikelyVideoUrl = (url = "") =>
  /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i.test(url) ||
  url.includes("/video/upload/") ||
  url.includes("resource_type=video");

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
  const [search, setSearch] = useState("");

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

  const onCreate = () => {
    resetForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shownAds = ads.filter((ad) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${ad.title || ""} ${ad.type || ""} ${ad.placement || ""}`.toLowerCase();
    return hay.includes(q);
  });

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
    if (form.type === "video" && !isLikelyVideoUrl(form.mediaUrl.trim())) {
      setError(
        "For video ads, mediaUrl must be a real video URL (mp4/webm/Cloudinary video)."
      );
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
      <PageHeader
        title="Ads Manager"
        subtitle="Create and manage high-quality banner, native, and video ads."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="ads-layout">
        <form onSubmit={handleSubmit} className="card card-padded">
          <h2 className="card-header">{editingId ? "Edit ad" : "Create new ad"}</h2>

          <div className="form-grid">
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                {(meta.types || ["banner", "video", "native"]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Placement</label>
              <select
                value={form.placement}
                onChange={(e) => setField("placement", e.target.value)}
              >
                {(meta.placements || Object.keys(PLACEMENT_LABELS)).map((p) => (
                  <option key={p} value={p}>
                    {PLACEMENT_LABELS[p] || p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Media URL</label>
            <input
              value={form.mediaUrl}
              onChange={(e) => setField("mediaUrl", e.target.value)}
              placeholder="https://..."
            />
            <div className="upload-btns">
              <label className="upload-label">
                {uploading ? "Uploading..." : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleUpload(e, "image")}
                />
              </label>
              {form.type === "video" ? (
                <label className="upload-label">
                  Upload video
                  <input
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={(e) => handleUpload(e, "video")}
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update ad" : "Create ad"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <aside className="card card-padded ad-preview-panel">
          <h3 className="card-header" style={{ marginBottom: 12 }}>
            Live preview
          </h3>
          <div className="ad-preview-box">
            {form.mediaUrl ? (
              form.type === "video" ? (
                <video
                  src={form.mediaUrl}
                  poster={form.posterUrl || undefined}
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img src={form.mediaUrl} alt="Ad preview" />
              )
            ) : (
              <div className="ad-preview-placeholder">Fill ad form to preview here.</div>
            )}
          </div>
        </aside>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by title/type/placement�"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <select
          value={filterPlacement}
          onChange={(e) => setFilterPlacement(e.target.value)}
        >
          <option value="">All placements</option>
          {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={onCreate}>
          Create
        </button>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <Loading message="Loading ads..." />
      ) : shownAds.length === 0 ? (
        <div className="empty-state card card-padded">No ads match your filters.</div>
      ) : (
        <div className="ads-grid">
          {shownAds.map((ad) => (
            <article key={ad._id} className="ad-card">
              <div className="ad-card-thumb">
                {ad.type === "video" ? (
                  <video src={ad.mediaUrl} muted />
                ) : (
                  <img src={ad.mediaUrl} alt={ad.title || "Ad"} />
                )}
              </div>
              <div className="ad-card-body">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={`badge badge-type-${ad.type}`}>{ad.type}</span>
                  <span className={`badge ${ad.isActive ? "badge-active" : "badge-inactive"}`}>
                    {ad.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="ad-card-title">{ad.title || "Untitled ad"}</div>
                <div className="ad-card-meta">
                  {PLACEMENT_LABELS[ad.placement] || ad.placement}
                </div>
                <div className="ad-card-stats">
                  {ad.impressions || 0} views � {ad.clicks || 0} clicks
                </div>
                <div className="ad-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(ad)}>
                    Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(ad)}>
                    {ad.isActive ? "Pause" : "Activate"}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ad._id)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
