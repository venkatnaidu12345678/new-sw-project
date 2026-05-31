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
  const [modalOpen, setModalOpen] = useState(false);
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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
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
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
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
      closeModal();
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
      if (editingId === id) closeModal();
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ads Manager"
        subtitle="Banner, native, and video placements for the mobile app"
      >
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Create ad
        </button>
      </PageHeader>

      {error && !modalOpen ? <div className="alert alert-error">{error}</div> : null}

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search title, type, placement…"
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
        <button type="button" className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <Loading message="Loading ads..." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Type</th>
                <th>Placement</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Views / Clicks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shownAds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No ads match your filters.
                  </td>
                </tr>
              ) : (
                shownAds.map((ad) => (
                  <tr key={ad._id}>
                    <td>
                      {ad.mediaUrl ? (
                        ad.type === "video" ? (
                          <video
                            src={ad.mediaUrl}
                            className="ad-thumb-cell"
                            muted
                          />
                        ) : (
                          <img
                            src={ad.mediaUrl}
                            alt=""
                            className="ad-thumb-cell"
                          />
                        )
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      <strong>{ad.title || "Untitled"}</strong>
                      {ad.description ? (
                        <div className="cell-muted">{ad.description}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className={`badge badge-type-${ad.type}`}>
                        {ad.type}
                      </span>
                    </td>
                    <td>{PLACEMENT_LABELS[ad.placement] || ad.placement}</td>
                    <td>{ad.priority ?? 0}</td>
                    <td>
                      <span
                        className={`badge ${ad.isActive ? "badge-active" : "badge-inactive"}`}
                      >
                        {ad.isActive ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td>
                      {ad.impressions || 0} / {ad.clicks || 0}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEdit(ad)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleActive(ad)}
                        >
                          {ad.isActive ? "Pause" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(ad._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div
            className="modal-card modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header-row">
              <h2 className="modal-title">
                {editingId ? "Edit ad" : "Create new ad"}
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setField("type", e.target.value)}
                  >
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
                    {(meta.placements || Object.keys(PLACEMENT_LABELS)).map(
                      (p) => (
                        <option key={p} value={p}>
                          {PLACEMENT_LABELS[p] || p}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Ad title"
                />
              </div>

              <div className="form-field">
                <label>Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Short description"
                />
              </div>

              <div className="form-field">
                <label>Media URL *</label>
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

              <div className="form-grid">
                <div className="form-field">
                  <label>Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setField("priority", e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setField("isActive", e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>

              {form.mediaUrl ? (
                <div className="ad-preview-box" style={{ marginBottom: 16 }}>
                  {form.type === "video" ? (
                    <video
                      src={form.mediaUrl}
                      poster={form.posterUrl || undefined}
                      muted
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : (
                    <img src={form.mediaUrl} alt="Preview" />
                  )}
                </div>
              ) : null}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingId ? "Update ad" : "Create ad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
