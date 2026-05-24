import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminLogin(email, password);
      localStorage.setItem("adminToken", res.token);
      localStorage.setItem("admin", JSON.stringify(res.admin));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Share Wheels Admin</h1>
        <p style={styles.sub}>Sign in to manage users, rides, and requests</p>
        {error && <div style={styles.error}>{error}</div>}
        <label style={styles.label}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" style={styles.btn} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#fff",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: 800 },
  sub: { color: "#64748b", fontSize: 14, marginBottom: 8 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 },
  btn: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
  },
  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
};
