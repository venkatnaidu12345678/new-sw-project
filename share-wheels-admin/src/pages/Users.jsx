import { useEffect, useState } from "react";
import { getUsers, updateUserVerification } from "../api/client";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
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

  return (
    <div>
      <h1 style={styles.heading}>Users</h1>
      <div style={styles.toolbar}>
        <input
          placeholder="Search name, email, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <button type="button" style={styles.btn} onClick={load}>
          Search
        </button>
      </div>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
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
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.mobile}</td>
                <td>{u.isVerified ? "Yes" : "No"}</td>
                <td>
                  <button
                    type="button"
                    style={styles.smallBtn}
                    onClick={() => toggleVerify(u._id, u.isVerified)}
                  >
                    {u.isVerified ? "Unverify" : "Verify"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  heading: { fontSize: 28, fontWeight: 800, marginBottom: 20 },
  toolbar: { display: "flex", gap: 12, marginBottom: 20 },
  btn: {
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
  },
  smallBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    background: "#fff",
    fontSize: 13,
  },
};
