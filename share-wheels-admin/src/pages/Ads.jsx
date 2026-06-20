import { useEffect, useMemo, useState } from "react";
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
import SearchInput from "../components/ui/SearchInput";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import IconActionButton, { TableActions } from "../components/ui/IconActionButton";
import { IconEdit, IconPause, IconPlay, IconTrash } from "../components/ui/icons";
import { Alert, btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";
import AdMediaPreview from "../components/ads/AdMediaPreview";
import {
  PLACEMENT_LABELS,
  PLACEMENT_RULES,
  defaultTypeForPlacement,
  getAllowedTypesForPlacement,
  isAdVisibleOnMobile,
  validateAdForm,
} from "../utils/adRules";

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
  const [meta, setMeta] = useState({ types: [], placements: [], placementRules: PLACEMENT_RULES });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filterPlacement, setFilterPlacement] = useState("");
  const [search, setSearch] = useState("");

  const placementRules = meta.placementRules || PLACEMENT_RULES;
  const allowedTypes = useMemo(
    () => getAllowedTypesForPlacement(form.placement),
    [form.placement]
  );
  const placementHint = placementRules[form.placement]?.label || "";

  const load = () => {
    setLoading(true);
    const params = filterPlacement ? { placement: filterPlacement } : {};
    getAds(params)
      .then((res) => setAds(res.ads || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getAdsMeta()
      .then((res) =>
        setMeta({
          types: res.types || [],
          placements: res.placements || Object.keys(PLACEMENT_LABELS),
          placementRules: res.placementRules || PLACEMENT_RULES,
        })
      )
      .catch(() => {});
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

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(shownAds, {
    resetDeps: [search, filterPlacement],
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handlePlacementChange = (placement) => {
    const nextType = defaultTypeForPlacement(placement);
    setForm((f) => ({
      ...f,
      placement,
      type: getAllowedTypesForPlacement(placement).includes(f.type) ? f.type : nextType,
    }));
  };

  const handleUpload = async (e, mediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadAdMedia(file, mediaType);
      setField("mediaUrl", res.url);
      if (res.posterUrl) setField("posterUrl", res.posterUrl);
      if (mediaType === "video") setField("type", "video");
      if (mediaType === "image" && form.placement === "home_video") {
        setError("Home video placement requires a video file, not an image.");
      }
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
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.mediaUrl.trim()) {
      setError("Upload or paste a media URL");
      return;
    }
    const validationMsg = validateAdForm(form);
    if (validationMsg) {
      setError(validationMsg);
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

  const canUploadImage = form.placement !== "home_video";
  const canUploadVideo =
    form.placement === "home_video" || allowedTypes.includes("video");

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Ads Manager"
        subtitle="Manage mobile placements — banners (2.4:1 carousel), home video playlist, and native cards"
      >
        <button type="button" className={btnClass("primary", "sm")} onClick={openCreate}>
          Create ad
        </button>
      </PageHeader>

      {error && !modalOpen ? <Alert className="mb-3 shrink-0">{error}</Alert> : null}

      <FilterBar>
        <SearchInput
          placeholder="Search title, type, placement…"
          onDebouncedChange={setSearch}
        />
        <select
          className={inputClass("max-w-xs")}
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
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
          Refresh
        </button>
      </FilterBar>

      <AdminTablePanel>
        {loading ? (
          <Loading message="Loading ads..." className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>Preview</Th>
                  <Th sticky>Title</Th>
                  <Th sticky>Type</Th>
                  <Th sticky>Placement</Th>
                  <Th sticky>App</Th>
                  <Th sticky>Priority</Th>
                  <Th sticky>Status</Th>
                  <Th sticky>Views / Clicks</Th>
                  <Th sticky>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr>
                    <Td colSpan={9} className="py-10 text-center text-slate-500">
                      No ads match your filters.
                    </Td>
                  </tr>
                ) : (
                  paginatedItems.map((ad) => {
                    const visible = isAdVisibleOnMobile(ad);
                    return (
                      <tr key={ad._id} className="hover:bg-slate-50/80">
                        <Td>
                          {ad.mediaUrl ? (
                            <AdMediaPreview ad={ad} size="thumb" />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </Td>
                        <Td>
                          <div className="font-semibold text-slate-800">{ad.title || "Untitled"}</div>
                          {ad.description ? (
                            <div className="text-xs text-slate-500">{ad.description}</div>
                          ) : null}
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset ${typeBadge(ad.type)}`}
                          >
                            {ad.type}
                          </span>
                        </Td>
                        <Td>{PLACEMENT_LABELS[ad.placement] || ad.placement}</Td>
                        <Td>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                              visible
                                ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                                : "bg-amber-100 text-amber-800 ring-amber-200"
                            }`}
                            title={
                              visible
                                ? "Will appear in the mobile app"
                                : "Hidden on mobile — fix type, media, or placement"
                            }
                          >
                            {visible ? "Visible" : "Hidden"}
                          </span>
                        </Td>
                        <Td>{ad.priority ?? 0}</Td>
                        <Td>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                              ad.isActive
                                ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                                : "bg-slate-100 text-slate-600 ring-slate-200"
                            }`}
                          >
                            {ad.isActive ? "Active" : "Paused"}
                          </span>
                        </Td>
                        <Td>
                          {ad.impressions || 0} / {ad.clicks || 0}
                        </Td>
                        <Td>
                          <TableActions>
                            <IconActionButton icon={IconEdit} label="Edit ad" onClick={() => startEdit(ad)} />
                            <IconActionButton
                              icon={ad.isActive ? IconPause : IconPlay}
                              label={ad.isActive ? "Pause ad" : "Activate ad"}
                              variant="ghost"
                              onClick={() => toggleActive(ad)}
                            />
                            <IconActionButton
                              icon={IconTrash}
                              label="Delete ad"
                              variant="danger"
                              onClick={() => handleDelete(ad._id)}
                            />
                          </TableActions>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </AdminTablePanel>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? "Edit ad" : "Create new ad"}
              </h2>
              <button type="button" className={btnClass("ghost", "sm")} onClick={closeModal}>
                Close
              </button>
            </div>
            {error ? <Alert className="mb-4">{error}</Alert> : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Placement</span>
                <select
                  className={inputClass()}
                  value={form.placement}
                  onChange={(e) => handlePlacementChange(e.target.value)}
                >
                  {(meta.placements || Object.keys(PLACEMENT_LABELS)).map((p) => (
                    <option key={p} value={p}>
                      {PLACEMENT_LABELS[p] || p}
                    </option>
                  ))}
                </select>
                {placementHint ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{placementHint}</p>
                ) : null}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Type</span>
                <select
                  className={inputClass()}
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                >
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Title</span>
                <input
                  className={inputClass()}
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Ad title"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Description</span>
                <input
                  className={inputClass()}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Short description (native ads)"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Media URL *</span>
                <input
                  className={inputClass()}
                  value={form.mediaUrl}
                  onChange={(e) => setField("mediaUrl", e.target.value)}
                  placeholder={
                    form.placement === "home_video"
                      ? "https://…/video.mp4 or Cloudinary video URL"
                      : "https://… image URL"
                  }
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {canUploadImage ? (
                    <label className={`${btnClass("secondary", "sm")} cursor-pointer`}>
                      {uploading ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleUpload(e, "image")}
                      />
                    </label>
                  ) : null}
                  {canUploadVideo ? (
                    <label className={`${btnClass("secondary", "sm")} cursor-pointer`}>
                      {uploading ? "Uploading..." : "Upload video"}
                      <input
                        type="file"
                        accept="video/*"
                        hidden
                        onChange={(e) => handleUpload(e, "video")}
                      />
                    </label>
                  ) : null}
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">CTA label</span>
                  <input
                    className={inputClass()}
                    value={form.ctaLabel}
                    onChange={(e) => setField("ctaLabel", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">CTA URL</span>
                  <input
                    className={inputClass()}
                    value={form.ctaUrl}
                    onChange={(e) => setField("ctaUrl", e.target.value)}
                    placeholder="https://"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Priority</span>
                  <input
                    className={inputClass()}
                    type="number"
                    value={form.priority}
                    onChange={(e) => setField("priority", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Higher priority shows first. Home video ads play in priority order.
                  </p>
                </label>
                <label className="flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Active
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Starts at</span>
                  <input
                    className={inputClass()}
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setField("startsAt", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Ends at</span>
                  <input
                    className={inputClass()}
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setField("endsAt", e.target.value)}
                  />
                </label>
              </div>

              {form.mediaUrl ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mobile preview
                  </p>
                  <AdMediaPreview ad={form} size="modal" />
                  {!isAdVisibleOnMobile(form) ? (
                    <p className="mt-2 text-xs text-amber-700">
                      This combination will not appear in the app — check type, media URL, and
                      placement.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" className={btnClass("secondary")} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={btnClass("primary")} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update ad" : "Create ad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
