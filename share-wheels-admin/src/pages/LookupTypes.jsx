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
    <div>
      <PageHeader
        title="Dropdown options"
        subtitle="Courier and vehicle types shown in the mobile app pickers."
      />

      <div className="tabs" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${category === t.key ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setCategory(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={handleAdd} className="card" style={{ marginBottom: 16 }}>
        <h3>Add {tab?.label?.toLowerCase()}</h3>
        <div className="form-row">
          <input
            className="input"
            placeholder="Display label (e.g. Parcel)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Add
          </button>
        </div>
      </form>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Bulk import</h3>
        <textarea
          className="input"
          rows={4}
          placeholder="One label per line"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: 8 }}
          disabled={saving}
          onClick={handleBulk}
        >
          Import lines
        </button>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search label or value…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <Loading message={`Loading ${tab?.label?.toLowerCase()}?`} />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Value</th>
              <th>Order</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5}>No options yet. Add some above or run seedLookupTypes.js.</td>
              </tr>
            ) : (
              shown.map((row) => (
                <tr key={row._id}>
                  <td>{row.label}</td>
                  <td>
                    <code>{row.value}</code>
                  </td>
                  <td>{row.sortOrder ?? 0}</td>
                  <td>{row.isActive ? "Yes" : "No"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={saving}
                      onClick={() => handleToggle(row)}
                    >
                      {row.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={saving}
                      onClick={() => handleDelete(row._id)}
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
