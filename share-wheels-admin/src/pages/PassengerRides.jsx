import { useEffect, useState } from "react";
import { getPassengerRides } from "../api/client";
import StatusBadge from "../components/StatusBadge";

export default function PassengerRides() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (statusFilter) params.status = statusFilter;
    getPassengerRides(params)
      .then((res) => setRows(res.passengerRides || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div>
      <h1 style={styles.heading}>Passenger Requests</h1>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={{ maxWidth: 220, marginBottom: 20 }}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="aisgned_passenger">Assigned</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Passenger</th>
              <th>Route</th>
              <th>Seats</th>
              <th>Offered (₹)</th>
              <th>Date</th>
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
                <td>{r.seats_needed}</td>
                <td>₹{r.amount_will ?? 0}</td>
                <td>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                <td>
                  <StatusBadge status={r.status} />
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
