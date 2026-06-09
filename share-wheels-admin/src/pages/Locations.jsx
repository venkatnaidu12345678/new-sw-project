import { useEffect, useState } from "react";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  bulkUpsertLocations,
  clearAllLocations,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import SearchInput from "../components/ui/SearchInput";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import IconActionButton, { TableActions } from "../components/ui/IconActionButton";
import { IconEye, IconEyeOff, IconTrash } from "../components/ui/icons";
import { Alert, btnClass, inputClass, ModalBackdrop, Table, Th, Td } from "../components/ui/primitives";

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [search, setSearch] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    getLocations()
      .then((res) => setLocations(res.locations || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const shown = locations.filter((loc) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (loc.name || "").toLowerCase().includes(q);
  });

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(shown, {
    resetDeps: [search],
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      await createLocation({ name, isActive: true });
      setNewName("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (loc) => {
    setSaving(true);
    setError("");
    try {
      await updateLocation(loc._id, { isActive: !loc.isActive });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this location?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteLocation(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    const names = bulkText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!names.length) {
      setError("Paste at least one location name (one per line).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await bulkUpsertLocations(names);
      setBulkText("");
      setBulkModalOpen(false);
      alert(res.message || "Locations imported.");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Remove all location suggestions from the app?")) return;
    setSaving(true);
    setError("");
    try {
      await clearAllLocations();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell>
      <PageHeader compact title="Locations" subtitle="From/to city suggestions in the mobile app">
        <button type="button" className={btnClass("secondary", "sm")} onClick={() => setBulkModalOpen(true)}>Bulk import</button>
        <button type="button" className={btnClass("danger", "sm")} onClick={handleClearAll} disabled={saving}>Clear all</button>
      </PageHeader>
      {error ? <Alert className="mb-3 shrink-0">{error}</Alert> : null}
      <form onSubmit={handleAdd}>
        <FilterBar>
          <input className={inputClass("max-w-xs")} placeholder="Add city name…" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" className={btnClass("primary", "sm")} disabled={saving}>Add location</button>
          <SearchInput placeholder="Search locations…" onDebouncedChange={setSearch} />
          <button type="button" className={btnClass("secondary", "sm")} onClick={load}>Refresh</button>
        </FilterBar>
      </form>

      <AdminTablePanel>
        {loading ? (
          <Loading message="Loading locations…" className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr><Th sticky>#</Th><Th sticky>Name</Th><Th sticky>Status</Th><Th sticky>Actions</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr><Td colSpan={4} className="py-10 text-center text-slate-500">No locations yet. Add a city above.</Td></tr>
                ) : (
                  paginatedItems.map((loc, index) => (
                    <tr key={loc._id} className="hover:bg-slate-50/80">
                      <Td className="text-slate-400">{(page - 1) * pageSize + index + 1}</Td>
                      <Td className="font-medium text-slate-800">{loc.name}</Td>
                      <Td>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${loc.isActive ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                          {loc.isActive ? "Active" : "Hidden"}
                        </span>
                      </Td>
                      <Td>
                        <TableActions>
                          <IconActionButton
                            icon={loc.isActive ? IconEyeOff : IconEye}
                            label={loc.isActive ? "Hide location" : "Show location"}
                            onClick={() => handleToggle(loc)}
                            disabled={saving}
                          />
                          <IconActionButton
                            icon={IconTrash}
                            label="Delete location"
                            variant="danger"
                            onClick={() => handleDelete(loc._id)}
                            disabled={saving}
                          />
                        </TableActions>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </AdminTablePanel>

      {bulkModalOpen ? (
        <ModalBackdrop onClose={() => setBulkModalOpen(false)} size="lg">
          <h2 className="text-xl font-bold text-slate-900">Bulk import locations</h2>
          <p className="mt-2 text-sm text-slate-500">One city per line. Existing names are reactivated; others stay unchanged.</p>
          <textarea rows={10} className={`${inputClass()} mt-4`} placeholder={"Hyderabad\nVijayawada\nVisakhapatnam"} value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={btnClass("secondary")} onClick={() => setBulkModalOpen(false)}>Cancel</button>
            <button type="button" className={btnClass("primary")} onClick={handleBulkImport} disabled={saving}>{saving ? "Importing…" : "Import"}</button>
          </div>
        </ModalBackdrop>
      ) : null}
    </AdminPageShell>
  );
}
