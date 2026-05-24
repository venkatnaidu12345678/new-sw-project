import { useEffect, useState } from "react";
import { getStats } from "../api/client";

const StatCard = ({ label, value, color }) => (
  <div style={{ ...styles.card, borderLeft: `4px solid ${color}` }}>
    <div style={styles.cardLabel}>{label}</div>
    <div style={styles.cardValue}>{value ?? "—"}</div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.stats))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 style={styles.heading}>Dashboard</h1>
      <p style={styles.sub}>Platform overview</p>
      {error && <p style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</p>}
      <div style={styles.grid}>
        <StatCard label="Total Users" value={stats?.totalUsers} color="#2563eb" />
        <StatCard label="Verified Users" value={stats?.verifiedUsers} color="#16a34a" />
        <StatCard label="Total Rides" value={stats?.totalRides} color="#7c3aed" />
        <StatCard label="Active Rides" value={stats?.activeRides} color="#0891b2" />
        <StatCard label="Completed Rides" value={stats?.completedRides} color="#15803d" />
        <StatCard
          label="Open Passenger Requests"
          value={stats?.openPassengerRequests}
          color="#ea580c"
        />
        <StatCard label="Open Couriers" value={stats?.openCouriers} color="#db2777" />
      </div>
    </div>
  );
}

const styles = {
  heading: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  sub: { color: "#64748b", marginBottom: 28 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  cardLabel: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 800 },
};
