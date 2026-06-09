import { useEffect, useState } from "react";
import { getPassengerRides } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import SearchInput from "../components/ui/SearchInput";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import { btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";

export default function PassengerRides() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = { limit: 50 };
    if (statusFilter) params.status = statusFilter;
    getPassengerRides(params)
      .then((res) => setRows(res.passengerRides || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${r.creator?.name || ""} ${r.from || ""} ${r.to || ""} ${r.status || ""}`.toLowerCase();
    return hay.includes(q);
  });

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(
    filteredRows,
    { resetDeps: [search, statusFilter] }
  );

  return (
    <AdminPageShell>
      <PageHeader compact title="Passenger Requests" subtitle="Track pending and assigned passenger ride requests." />
      <FilterBar>
        <SearchInput placeholder="Search passenger, route…" onDebouncedChange={setSearch} />
        <select className={inputClass("max-w-[200px]")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="aisgned_passenger">Assigned</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>Refresh</button>
      </FilterBar>

      <AdminTablePanel>
        {loading ? (
          <Loading message="Loading passenger requests…" className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>Passenger</Th>
                  <Th sticky>Route</Th>
                  <Th sticky>Seats</Th>
                  <Th sticky>Offered (₹)</Th>
                  <Th sticky>Date</Th>
                  <Th sticky>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr><Td colSpan={6} className="py-10 text-center text-slate-500">No passenger requests found.</Td></tr>
                ) : (
                  paginatedItems.map((r) => (
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
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </AdminTablePanel>
    </AdminPageShell>
  );
}
