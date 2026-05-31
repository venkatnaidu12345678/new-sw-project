import { useEffect, useState } from "react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserVerification,
  backfillUserPasswords,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

const EMPTY_FORM = {
  name: "",
  email: "",
  mobile: "",
  gender: "male",
  password: "",
  isVerified: true,
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = () => {
    setLoading(true);
    setError("");
    getUsers({ search, limit: 200 })
      .then((res) => setUsers(res.users || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      mobile: u.mobile || "",
      gender: u.gender || "male",
      password: "",
      isVerified: !!u.isVerified,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.replace(/\D/g, "").slice(-10),
        gender: form.gender,
        isVerified: form.isVerified,
      };
      if (form.password.trim()) {
        payload.password = form.password;
      } else if (!editing) {
        alert("Password is required for new users (min 6 characters).");
        setSaving(false);
        return;
      }

      if (editing) {
        await updateUser(editing._id, payload);
      } else {
        await createUser({ ...payload, password: form.password });
      }
      closeModal();
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (
      !window.confirm(
        `Delete ${u.name || u.email}? This removes their rides, requests, messages, and notifications.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await deleteUser(u._id);
      alert(res.message || "User deleted");
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackfillPasswords = async () => {
    const input = window.prompt(
      "Default password for users missing one in admin (min 6 chars):",
      "password123"
    );
    if (input == null) return;
    if (String(input).trim().length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    try {
      setBackfillLoading(true);
      const res = await backfillUserPasswords(String(input).trim());
      alert(res.message || "Done");
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBackfillLoading(false);
    }
  };

  const toggleVerify = async (id, current) => {
    try {
      await updateUserVerification(id, !current);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (verifiedFilter === "all") return true;
    return verifiedFilter === "verified" ? !!u.isVerified : !u.isVerified;
  });

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Create, edit, and delete app users. Deleting a user removes all related rides and data."
      />

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search name, email, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          style={{ maxWidth: 220 }}
        >
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Create user
        </button>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Search
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleBackfillPasswords}
          disabled={backfillLoading}
        >
          {backfillLoading ? "Loading…" : "Load missing passwords"}
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <Loading message="Loading users…" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Password</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name || "—"}</td>
                    <td>{u.email || "—"}</td>
                    <td>{u.mobile || "—"}</td>
                    <td>
                      <code
                        className="password-cell"
                        title={u.password ? "Login password" : "Not stored"}
                      >
                        {u.password ?? "—"}
                      </code>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.isVerified ? "badge-active" : "badge-inactive"}`}
                      >
                        {u.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleVerify(u._id, u.isVerified)}
                        >
                          {u.isVerified ? "Unverify" : "Verify"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(u)}
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

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="modal-title">{editing ? "Edit user" : "Create user"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </label>
              <label>
                Mobile (10 digits)
                <input
                  value={form.mobile}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  required
                  maxLength={10}
                />
              </label>
              <label>
                Gender
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                {editing ? "New password (leave blank to keep)" : "Password"}
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? "Optional" : "Min 6 characters"}
                  required={!editing}
                  minLength={editing ? 0 : 6}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.isVerified}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isVerified: e.target.checked }))
                  }
                />
                Verified (can use app immediately)
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
