import { useEffect, useState } from "react";
import { getCouriers } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

export default function Couriers() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (statusFilter) params.status = statusFilter;
    getCouriers(params)
      .then((res) => setRows(res.couriers || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const onCreate = () => {
    alert("Create courier requests is not available in this admin UI yet.");
  };

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${r.creator?.name || ""} ${r.from || ""} ${r.to || ""} ${r.courier_status || ""} ${r.what_to_deliver || ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Courier Requests"
        subtitle="Review courier deliveries and assignment pipeline."
      />

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search courier, route, parcel?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 240 }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="request_to_driver">Request to driver</option>
          <option value="driver_assigned">Driver assigned</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={onCreate}>
          Create
        </button>
      </div>

      {loading ? (
        <Loading message="Loading courier requests?" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Route</th>
                <th>Parcel</th>
                <th>Amount (?)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No courier requests found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.creator?.name || "?"}</td>
                    <td>
                      {r.from} ? {r.to}
                    </td>
                    <td>{r.what_to_deliver || "?"}</td>
                    <td>?{r.amount_will ?? 0}</td>
                    <td>
                      <StatusBadge status={r.courier_status} />
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
