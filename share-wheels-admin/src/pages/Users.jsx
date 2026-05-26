import { useEffect, useState } from "react";
import { getUsers, updateUserVerification } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const onCreate = () => {
    alert("Create users is not available in this admin UI yet.");
  };

  const load = () => {
    setLoading(true);
    setError("");
    getUsers({ search, limit: 50 })
      .then((res) => setUsers(res.users || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

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
      <PageHeader title="Users" subtitle="Review and verify user accounts." />

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search name, email, mobile?"
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
        <button type="button" className="btn btn-secondary" onClick={onCreate}>
          Create
        </button>
        <button type="button" className="btn btn-primary" onClick={load}>
          Search
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <Loading message="Loading users?" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Verified</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name || "?"}</td>
                    <td>{u.email || "?"}</td>
                    <td>{u.mobile || "?"}</td>
                    <td>
                      <span className={`badge ${u.isVerified ? "badge-active" : "badge-inactive"}`}>
                        {u.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleVerify(u._id, u.isVerified)}
                      >
                        {u.isVerified ? "Unverify" : "Verify"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
