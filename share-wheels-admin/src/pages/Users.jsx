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
import { Alert, btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";

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
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Users"
        subtitle="Create, edit, and delete app users. Deleting a user removes all related rides and data."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          className={inputClass("max-w-sm")}
          placeholder="Search name, email, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={inputClass("max-w-[180px]")}
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <button type="button" className={btnClass("primary", "sm")} onClick={openCreate}>
          Create user
        </button>
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
          Search
        </button>
        <button
          type="button"
          className={btnClass("secondary", "sm")}
          onClick={handleBackfillPasswords}
          disabled={backfillLoading}
        >
          {backfillLoading ? "Loading…" : "Load missing passwords"}
        </button>
      </div>

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      {loading ? (
        <Loading message="Loading users…" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Mobile</Th>
              <Th>Password</Th>
              <Th>Verified</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredUsers.length === 0 ? (
              <tr>
                <Td colSpan={6} className="py-12 text-center text-slate-500">
                  No users found.
                </Td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/80">
                  <Td className="font-medium text-slate-800">{u.name || "—"}</Td>
                  <Td>{u.email || "—"}</Td>
                  <Td>{u.mobile || "—"}</Td>
                  <Td>
                    <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                      {u.password ?? "—"}
                    </code>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${u.isVerified ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}
                    >
                      {u.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className={btnClass("secondary", "sm")} onClick={() => openEdit(u)}>
                        Edit
                      </button>
                      <button type="button" className={btnClass("ghost", "sm")} onClick={() => toggleVerify(u._id, u.isVerified)}>
                        {u.isVerified ? "Unverify" : "Verify"}
                      </button>
                      <button type="button" className={btnClass("danger", "sm")} onClick={() => handleDelete(u)} disabled={saving}>
                        Delete
                      </button>
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
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="mb-4 text-xl font-bold text-slate-900">{editing ? "Edit user" : "Create user"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Full name
                <input className={`${inputClass()} mt-1.5`} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input type="email" className={`${inputClass()} mt-1.5`} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Mobile (10 digits)
                <input className={`${inputClass()} mt-1.5`} value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required maxLength={10} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Gender
                <select className={`${inputClass()} mt-1.5`} value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {editing ? "New password (leave blank to keep)" : "Password"}
                <input type="text" className={`${inputClass()} mt-1.5`} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editing ? "Optional" : "Min 6 characters"} required={!editing} minLength={editing ? 0 : 6} />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.isVerified} onChange={(e) => setForm((f) => ({ ...f, isVerified: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                Verified (can use app immediately)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={btnClass("secondary")} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={btnClass("primary")} disabled={saving}>
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
