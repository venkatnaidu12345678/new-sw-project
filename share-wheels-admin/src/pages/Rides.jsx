import { useEffect, useState } from "react";
import { getRides, updateRideStatus } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

export default function Rides() {
  const [rides, setRides] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = { limit: 50 };
    if (statusFilter) params.status = statusFilter;
    getRides(params)
      .then((res) => setRides(res.rides || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const onCreate = () => {
    alert("Create rides is not available in this admin UI yet.");
  };

  const changeStatus = async (id, status) => {
    try {
      await updateRideStatus(id, status);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredRides = rides.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${r.from || ""} ${r.to || ""} ${r.creator?.name || ""} ${r.status || ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div>
      <PageHeader title="Rides" subtitle="Monitor and manage ride lifecycle." />

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search route or driver?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 220 }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="started">Started</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={onCreate}>
          Create
        </button>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <Loading message="Loading rides..." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Driver</th>
                <th>Date</th>
                <th>Seats</th>
                <th>Price/seat</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredRides.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No rides found.
                  </td>
                </tr>
              ) : (
                filteredRides.map((r) => (
                  <tr key={r._id}>
                    <td>{`${r.from || ""} -> ${r.to || ""}`}</td>
                    <td>{r.creator?.name || "-"}</td>
                    <td>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                    <td>{r.availableSeats ?? "-"}</td>
                    <td>INR {r.ride_amount ?? 0}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) => changeStatus(r._id, e.target.value)}
                        style={{ maxWidth: 150 }}
                      >
                        <option value="pending">pending</option>
                        <option value="started">started</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
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
