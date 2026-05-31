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
    const names = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
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
    <div>
      <PageHeader
        title="Locations"
        subtitle="From/to city suggestions in the mobile app"
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setBulkModalOpen(true)}
        >
          Bulk import
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleClearAll}
          disabled={saving}
        >
          Clear all
        </button>
      </PageHeader>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={handleAdd} className="toolbar" style={{ marginBottom: 20 }}>
        <input
          placeholder="Add city name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Add location
        </button>
        <input
          placeholder="Search locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <button type="button" className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </form>

      {loading ? (
        <Loading message="Loading locations..." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No locations yet. Add a city above.
                  </td>
                </tr>
              ) : (
                shown.map((loc, index) => (
                  <tr key={loc._id}>
                    <td className="cell-muted">{index + 1}</td>
                    <td>{loc.name}</td>
                    <td>
                      <span
                        className={`badge ${loc.isActive ? "badge-active" : "badge-inactive"}`}
                      >
                        {loc.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggle(loc)}
                          disabled={saving}
                        >
                          {loc.isActive ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(loc._id)}
                          disabled={saving}
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

      {bulkModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setBulkModalOpen(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="modal-title">Bulk import locations</h2>
            <p className="modal-subtitle">
              One city per line. Existing names are reactivated; others stay unchanged.
            </p>
            <textarea
              rows={10}
              placeholder={"Hyderabad\nVijayawada\nVisakhapatnam"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              style={{ width: "100%", marginBottom: 16 }}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBulkModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBulkImport}
                disabled={saving}
              >
                {saving ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
