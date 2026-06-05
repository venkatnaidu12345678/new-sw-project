import { useEffect, useState } from "react";
import { getPassengerRides } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import { inputClass, Table, Th, Td } from "../components/ui/primitives";

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

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${r.creator?.name || ""} ${r.from || ""} ${r.to || ""} ${r.status || ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Passenger Requests" subtitle="Track pending and assigned passenger ride requests." />
      <div className="mb-5 flex flex-wrap gap-2">
        <input className={inputClass("max-w-sm")} placeholder="Search passenger, route…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={inputClass("max-w-[200px]")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="aisgned_passenger">Assigned</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? (
        <Loading message="Loading passenger requests…" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Passenger</Th>
              <Th>Route</Th>
              <Th>Seats</Th>
              <Th>Offered (₹)</Th>
              <Th>Date</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr><Td colSpan={6} className="py-12 text-center text-slate-500">No passenger requests found.</Td></tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/80">
                  <Td className="font-medium">{r.creator?.name || "—"}</Td>
                  <Td><span className="font-medium">{r.from}</span> → {r.to}</Td>
                  <Td>{r.seats_needed ?? "—"}</Td>
                  <Td>₹{r.amount_will ?? 0}</Td>
                  <Td>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
