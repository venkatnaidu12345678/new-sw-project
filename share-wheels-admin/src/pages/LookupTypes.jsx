import { useEffect, useState } from "react";
import {
  getLookupTypes,
  createLookupType,
  updateLookupType,
  deleteLookupType,
  bulkUpsertLookupTypes,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import SearchInput from "../components/ui/SearchInput";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import IconActionButton, { TableActions } from "../components/ui/IconActionButton";
import { IconToggle, IconTrash } from "../components/ui/icons";
import { Alert, btnClass, inputClass, ModalBackdrop, Table, Th, Td } from "../components/ui/primitives";

const TABS = [
  { key: "courier_type", label: "Courier types" },
  { key: "vehicle_type", label: "Vehicle types" },
];

export default function LookupTypes() {
  const [category, setCategory] = useState("courier_type");
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [search, setSearch] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    getLookupTypes(category)
      .then((res) => setTypes(res.types || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [category]);

  const shown = types.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${row.label || ""} ${row.value || ""}`.toLowerCase().includes(q);
  });

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(shown, {
    resetDeps: [search, category],
  });

  const slug = (label) =>
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const handleAdd = async (e) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    setSaving(true);
    setError("");
    try {
      await createLookupType({
        category,
        label,
        value: slug(label),
        isActive: true,
      });
      setNewLabel("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row) => {
    setSaving(true);
    setError("");
    try {
      await updateLookupType(row._id, { isActive: !row.isActive });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this option?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteLookupType(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      setError("Paste at least one label (one per line).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await bulkUpsertLookupTypes(
        category,
        lines.map((label) => ({ label, value: slug(label) }))
      );
      setBulkText("");
      setBulkModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tab = TABS.find((t) => t.key === category);

  return (
    <AdminPageShell>
      <PageHeader compact title="Dropdown options" subtitle="Courier and vehicle types shown in the mobile app pickers." />

      <FilterBar>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={category === t.key ? btnClass("primary", "sm") : btnClass("secondary", "sm")}
            onClick={() => setCategory(t.key)}
          >
            {t.label}
          </button>
        ))}
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <input
            className={inputClass("max-w-[180px]")}
            placeholder="New label…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button type="submit" className={btnClass("primary", "sm")} disabled={saving}>
            Add
          </button>
        </form>
        <SearchInput placeholder="Search label or value…" onDebouncedChange={setSearch} />
        <button type="button" className={btnClass("secondary", "sm")} onClick={() => setBulkModalOpen(true)}>
          Bulk import
        </button>
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
          Refresh
        </button>
      </FilterBar>

      {error ? <Alert className="mb-3 shrink-0">{error}</Alert> : null}

      <AdminTablePanel>
        {loading ? (
          <Loading message={`Loading ${tab?.label?.toLowerCase()}…`} className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>Label</Th>
                  <Th sticky>Value</Th>
                  <Th sticky>Order</Th>
                  <Th sticky>Active</Th>
                  <Th sticky>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr>
                    <Td colSpan={5} className="py-10 text-center text-slate-500">
                      No options yet.
                    </Td>
                  </tr>
                ) : (
                  paginatedItems.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/80">
                      <Td className="font-medium">{row.label}</Td>
                      <Td>
                        <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{row.value}</code>
                      </Td>
                      <Td>{row.sortOrder ?? 0}</Td>
                      <Td>{row.isActive ? "Yes" : "No"}</Td>
                      <Td>
                        <TableActions>
                          <IconActionButton
                            icon={IconToggle}
                            label={row.isActive ? "Disable option" : "Enable option"}
                            onClick={() => handleToggle(row)}
                            disabled={saving}
                          />
                          <IconActionButton
                            icon={IconTrash}
                            label="Delete option"
                            variant="danger"
                            onClick={() => handleDelete(row._id)}
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
          <h2 className="text-xl font-bold text-slate-900">Bulk import {tab?.label?.toLowerCase()}</h2>
          <p className="mt-2 text-sm text-slate-500">One label per line.</p>
          <textarea className={`${inputClass()} mt-4`} rows={8} placeholder="One label per line" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={btnClass("secondary")} onClick={() => setBulkModalOpen(false)}>Cancel</button>
            <button type="button" className={btnClass("primary")} disabled={saving} onClick={handleBulk}>Import lines</button>
          </div>
        </ModalBackdrop>
      ) : null}
    </AdminPageShell>
  );
}
