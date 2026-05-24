import { useEffect, useState } from "react";
import { getRides, updateRideStatus } from "../api/client";
import StatusBadge from "../components/StatusBadge";

export default function Rides() {
  const [rides, setRides] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
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

  const changeStatus = async (id, status) => {
    try {
      await updateRideStatus(id, status);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <h1 style={styles.heading}>Rides</h1>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={{ maxWidth: 200, marginBottom: 20 }}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="started">Started</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
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
            {rides.map((r) => (
              <tr key={r._id}>
                <td>
                  {r.from} → {r.to}
                </td>
                <td>{r.creator?.name || "—"}</td>
                <td>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                <td>{r.availableSeats}</td>
                <td>₹{r.ride_amount}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td>
                  <select
                    value={r.status}
                    onChange={(e) => changeStatus(r._id, e.target.value)}
                    style={{ maxWidth: 140 }}
                  >
                    <option value="pending">pending</option>
                    <option value="started">started</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
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
