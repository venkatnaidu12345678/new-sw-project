import { useEffect, useState } from "react";
import { getCouriers } from "../api/client";
import StatusBadge from "../components/StatusBadge";

export default function Couriers() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (statusFilter) params.status = statusFilter;
    getCouriers(params)
      .then((res) => setRows(res.couriers || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div>
      <h1 style={styles.heading}>Courier Requests</h1>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={{ maxWidth: 220, marginBottom: 20 }}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="request_to_driver">Request to driver</option>
        <option value="driver_assigned">Driver assigned</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Route</th>
              <th>Parcel</th>
              <th>Amount (₹)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.creator?.name || "—"}</td>
                <td>
                  {r.from} → {r.to}
                </td>
                <td>{r.what_to_deliver}</td>
                <td>₹{r.amount_will ?? 0}</td>
                <td>
                  <StatusBadge status={r.courier_status} />
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
};
