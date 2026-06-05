import { useEffect, useState } from "react";
import { getCouriers } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import { inputClass, Table, Th, Td } from "../components/ui/primitives";

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

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${r.creator?.name || ""} ${r.from || ""} ${r.to || ""} ${r.courier_status || ""} ${r.what_to_deliver || ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Courier Requests" subtitle="Review courier deliveries and assignment pipeline." />
      <div className="mb-5 flex flex-wrap gap-2">
        <input className={inputClass("max-w-sm")} placeholder="Search courier, route, parcel…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={inputClass("max-w-[220px]")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="request_to_driver">Request to driver</option>
          <option value="driver_assigned">Driver assigned</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? (
        <Loading message="Loading courier requests…" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Route</Th>
              <Th>Parcel</Th>
              <Th>Amount (₹)</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr><Td colSpan={5} className="py-12 text-center text-slate-500">No courier requests found.</Td></tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/80">
                  <Td className="font-medium">{r.creator?.name || "—"}</Td>
                  <Td><span className="font-medium">{r.from}</span> → {r.to}</Td>
                  <Td>{r.what_to_deliver || "—"}</Td>
                  <Td>₹{r.amount_will ?? 0}</Td>
                  <Td><StatusBadge status={r.courier_status} /></Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
