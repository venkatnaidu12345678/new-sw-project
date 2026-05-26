import { useEffect, useState } from "react";
import { getStats } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

const STAT_ITEMS = [
  { key: "totalUsers", label: "Total Users", icon: "U", iconBg: "#DBEAFE", iconColor: "#1D4ED8" },
  { key: "verifiedUsers", label: "Verified Users", icon: "V", iconBg: "#DCFCE7", iconColor: "#15803D" },
  { key: "totalRides", label: "Total Rides", icon: "R", iconBg: "#EDE9FE", iconColor: "#6D28D9" },
  { key: "activeRides", label: "Active Rides", icon: "A", iconBg: "#CFFAFE", iconColor: "#0E7490" },
  { key: "completedRides", label: "Completed Rides", icon: "C", iconBg: "#DCFCE7", iconColor: "#15803D" },
  { key: "openPassengerRequests", label: "Open Passenger Requests", icon: "P", iconBg: "#FFEDD5", iconColor: "#C2410C" },
  { key: "openCouriers", label: "Open Couriers", icon: "Q", iconBg: "#FCE7F3", iconColor: "#BE185D" },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStats()
      .then((res) => setStats(res.stats || {}))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview and live business health." />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <Loading message="Loading dashboard stats?" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {STAT_ITEMS.map((item) => (
                <tr key={item.key}>
                  <td>{item.label}</td>
                  <td style={{ fontWeight: 800 }}>{stats?.[item.key] ?? "?"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
