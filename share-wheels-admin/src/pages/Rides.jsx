import { useEffect, useState } from "react";
import { getRides, updateRideStatus } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import { btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";

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
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Rides" subtitle="Monitor and manage ride lifecycle." />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          className={inputClass("max-w-xs")}
          placeholder="Search route or driver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={inputClass("max-w-[200px]")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="started">Started</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <Loading message="Loading rides…" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Route</Th>
              <Th>Driver</Th>
              <Th>Date</Th>
              <Th>Seats</Th>
              <Th>Price/seat</Th>
              <Th>Status</Th>
              <Th>Update</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRides.length === 0 ? (
              <tr>
                <Td colSpan={7} className="py-12 text-center text-slate-500">
                  No rides found.
                </Td>
              </tr>
            ) : (
              filteredRides.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/80">
                  <Td>
                    <div className="font-semibold text-slate-800">{r.from}</div>
                    <div className="text-xs text-slate-500">→ {r.to}</div>
                  </Td>
                  <Td>{r.creator?.name || "—"}</Td>
                  <Td>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</Td>
                  <Td>{r.availableSeats ?? "—"}</Td>
                  <Td className="font-semibold">₹{r.ride_amount ?? 0}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td>
                    <select
                      className={inputClass("max-w-[140px] py-1.5")}
                      value={r.status}
                      onChange={(e) => changeStatus(r._id, e.target.value)}
                    >
                      <option value="pending">pending</option>
                      <option value="started">started</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
