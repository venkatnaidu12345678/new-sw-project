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
import { Alert, btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";

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

  const typeBadge = (type) => {
    const colors = {
      banner: "bg-blue-100 text-blue-800 ring-blue-200",
      video: "bg-violet-100 text-violet-800 ring-violet-200",
      native: "bg-cyan-100 text-cyan-800 ring-cyan-200",
    };
    return colors[type] || "bg-slate-100 text-slate-700 ring-slate-200";
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Ads Manager" subtitle="Banner, native, and video placements for the mobile app">
        <button type="button" className={btnClass("primary", "sm")} onClick={openCreate}>
          Create ad
        </button>
      </PageHeader>

      {error && !modalOpen ? <Alert className="mb-4">{error}</Alert> : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <input
          className={inputClass("max-w-sm")}
          placeholder="Search title, type, placement…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={inputClass("max-w-xs")} value={filterPlacement} onChange={(e) => setFilterPlacement(e.target.value)}>
          <option value="">All placements</option>
          {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <Loading message="Loading ads..." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Preview</Th>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Placement</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Views / Clicks</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {shownAds.length === 0 ? (
              <tr>
                <Td colSpan={8} className="py-12 text-center text-slate-500">
                  No ads match your filters.
                </Td>
              </tr>
            ) : (
              shownAds.map((ad) => (
                <tr key={ad._id} className="hover:bg-slate-50/80">
                  <Td>
                    {ad.mediaUrl ? (
                      ad.type === "video" ? (
                        <video src={ad.mediaUrl} className="h-14 w-24 rounded-lg object-cover" muted />
                      ) : (
                        <img src={ad.mediaUrl} alt="" className="h-14 w-24 rounded-lg object-cover" />
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-800">{ad.title || "Untitled"}</div>
                    {ad.description ? <div className="text-xs text-slate-500">{ad.description}</div> : null}
                  </Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset ${typeBadge(ad.type)}`}>
                      {ad.type}
                    </span>
                  </Td>
                  <Td>{PLACEMENT_LABELS[ad.placement] || ad.placement}</Td>
                  <Td>{ad.priority ?? 0}</Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${ad.isActive ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                      {ad.isActive ? "Active" : "Paused"}
                    </span>
                  </Td>
                  <Td>{ad.impressions || 0} / {ad.clicks || 0}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className={btnClass("secondary", "sm")} onClick={() => startEdit(ad)}>Edit</button>
                      <button type="button" className={btnClass("secondary", "sm")} onClick={() => toggleActive(ad)}>{ad.isActive ? "Pause" : "Activate"}</button>
                      <button type="button" className={btnClass("danger", "sm")} onClick={() => handleDelete(ad._id)}>Delete</button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={closeModal} role="presentation">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit ad" : "Create new ad"}</h2>
              <button type="button" className={btnClass("ghost", "sm")} onClick={closeModal}>Close</button>
            </div>
            {error ? <Alert className="mb-4">{error}</Alert> : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Type</span>
                  <select className={inputClass()} value={form.type} onChange={(e) => setField("type", e.target.value)}>
                    {(meta.types || ["banner", "video", "native"]).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Placement</span>
                  <select className={inputClass()} value={form.placement} onChange={(e) => setField("placement", e.target.value)}>
                    {(meta.placements || Object.keys(PLACEMENT_LABELS)).map((p) => (
                      <option key={p} value={p}>{PLACEMENT_LABELS[p] || p}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Title</span>
                <input className={inputClass()} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ad title" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Description</span>
                <input className={inputClass()} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Short description" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Media URL *</span>
                <input className={inputClass()} value={form.mediaUrl} onChange={(e) => setField("mediaUrl", e.target.value)} placeholder="https://..." />
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className={`${btnClass("secondary", "sm")} cursor-pointer`}>
                    {uploading ? "Uploading..." : "Upload image"}
                    <input type="file" accept="image/*" hidden onChange={(e) => handleUpload(e, "image")} />
                  </label>
                  {form.type === "video" ? (
                    <label className={`${btnClass("secondary", "sm")} cursor-pointer`}>
                      Upload video
                      <input type="file" accept="video/*" hidden onChange={(e) => handleUpload(e, "video")} />
                    </label>
                  ) : null}
                </div>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Priority</span>
                  <input className={inputClass()} type="number" value={form.priority} onChange={(e) => setField("priority", e.target.value)} />
                </label>
                <label className="flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} className="h-4 w-4 rounded" />
                  Active
                </label>
              </div>
              {form.mediaUrl ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {form.type === "video" ? (
                    <video src={form.mediaUrl} poster={form.posterUrl || undefined} className="max-h-48 w-full object-contain" muted autoPlay loop playsInline />
                  ) : (
                    <img src={form.mediaUrl} alt="Preview" className="max-h-48 w-full object-contain" />
                  )}
                </div>
              ) : null}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" className={btnClass("secondary")} onClick={closeModal}>Cancel</button>
                <button type="submit" className={btnClass("primary")} disabled={saving}>
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
