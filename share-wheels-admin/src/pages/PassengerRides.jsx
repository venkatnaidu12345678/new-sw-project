import { useEffect, useState } from "react";
import { getPassengerRides } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

export default function PassengerRides() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (statusFilter) params.status = statusFilter;
    getPassengerRides(params)
      .then((res) => setRows(res.passengerRides || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const onCreate = () => {
    alert("Create passenger requests is not available in this admin UI yet.");
  };

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${r.creator?.name || ""} ${r.from || ""} ${r.to || ""} ${r.status || ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Passenger Requests"
        subtitle="Track pending and assigned passenger ride requests."
      />

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search passenger, route, status?"
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
          <option value="aisgned_passenger">Assigned</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={onCreate}>
          Create
        </button>
      </div>

      {loading ? (
        <Loading message="Loading passenger requests?" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Passenger</th>
                <th>Route</th>
                <th>Seats</th>
                <th>Offered (?)</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No passenger requests found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.creator?.name || "?"}</td>
                    <td>
                      {r.from} ? {r.to}
                    </td>
                    <td>{r.seats_needed ?? "?"}</td>
                    <td>?{r.amount_will ?? 0}</td>
                    <td>{r.date ? new Date(r.date).toLocaleDateString() : "?"}</td>
                    <td>
                      <StatusBadge status={r.status} />
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
