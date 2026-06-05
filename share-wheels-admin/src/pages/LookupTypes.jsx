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
import { Alert, btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";

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
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tab = TABS.find((t) => t.key === category);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Dropdown options" subtitle="Courier and vehicle types shown in the mobile app pickers." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={category === t.key ? btnClass("primary", "sm") : btnClass("secondary", "sm")} onClick={() => setCategory(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {error ? <Alert className="mb-4">{error}</Alert> : null}
      <form onSubmit={handleAdd} className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Add {tab?.label?.toLowerCase()}</h3>
        <div className="flex flex-wrap gap-2">
          <input className={inputClass("max-w-sm")} placeholder="Display label (e.g. Parcel)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <button type="submit" className={btnClass("primary", "sm")} disabled={saving}>Add</button>
        </div>
      </form>
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Bulk import</h3>
        <textarea className={inputClass()} rows={4} placeholder="One label per line" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
        <button type="button" className={`${btnClass("secondary", "sm")} mt-2`} disabled={saving} onClick={handleBulk}>Import lines</button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={inputClass("max-w-sm")} placeholder="Search label or value…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>Refresh</button>
      </div>
      {loading ? (
        <Loading message={`Loading ${tab?.label?.toLowerCase()}…`} />
      ) : (
        <Table>
          <thead>
            <tr><Th>Label</Th><Th>Value</Th><Th>Order</Th><Th>Active</Th><Th>Actions</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {shown.length === 0 ? (
              <tr><Td colSpan={5} className="py-12 text-center text-slate-500">No options yet.</Td></tr>
            ) : (
              shown.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50/80">
                  <Td className="font-medium">{row.label}</Td>
                  <Td><code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{row.value}</code></Td>
                  <Td>{row.sortOrder ?? 0}</Td>
                  <Td>{row.isActive ? "Yes" : "No"}</Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <button type="button" className={btnClass("secondary", "sm")} disabled={saving} onClick={() => handleToggle(row)}>{row.isActive ? "Disable" : "Enable"}</button>
                      <button type="button" className={btnClass("danger", "sm")} disabled={saving} onClick={() => handleDelete(row._id)}>Delete</button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
