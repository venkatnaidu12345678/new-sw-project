import { useEffect, useState } from "react";
import { getRides, updateRideStatus } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import SearchInput from "../components/ui/SearchInput";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
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

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(
    filteredRides,
    { resetDeps: [search, statusFilter] }
  );

  return (
    <AdminPageShell>
      <PageHeader compact title="Rides" subtitle="Monitor and manage ride lifecycle." />

      <FilterBar>
        <SearchInput placeholder="Search route or driver…" onDebouncedChange={setSearch} />
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
      </FilterBar>

      <AdminTablePanel>
        {loading ? (
          <Loading message="Loading rides…" className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>Route</Th>
                  <Th sticky>Driver</Th>
                  <Th sticky>Date</Th>
                  <Th sticky>Seats</Th>
                  <Th sticky>Price/seat</Th>
                  <Th sticky>Status</Th>
                  <Th sticky>Update</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr>
                    <Td colSpan={7} className="py-10 text-center text-slate-500">
                      No rides found.
                    </Td>
                  </tr>
                ) : (
                  paginatedItems.map((r) => (
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
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </AdminTablePanel>
    </AdminPageShell>
  );
}
