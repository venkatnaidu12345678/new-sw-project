import { useEffect, useState } from "react";
import { getFeedbacks, updateFeedback } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import StatusBadge from "../components/StatusBadge";
import IconActionButton, { TableActions } from "../components/ui/IconActionButton";
import { IconCheck, IconCheckCircle } from "../components/ui/icons";
import { Alert, btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";

const STATUS_OPTIONS = ["all", "new", "reviewed", "resolved"];

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    const params = statusFilter !== "all" ? { status: statusFilter } : {};
    getFeedbacks(params)
      .then((res) => setFeedbacks(res.feedbacks || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const setStatus = async (id, status) => {
    try {
      await updateFeedback(id, { status });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(feedbacks, {
    resetDeps: [statusFilter],
  });

  return (
    <AdminPageShell>
      <PageHeader compact title="User feedback" subtitle="Messages submitted from the mobile app profile screen" />
      <FilterBar>
        <select className={inputClass("max-w-[200px]")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
        <button type="button" className={btnClass("primary", "sm")} onClick={load}>Refresh</button>
      </FilterBar>
      {error ? <Alert className="mb-3 shrink-0">{error}</Alert> : null}

      <AdminTablePanel>
        {loading ? (
          <Loading message="Loading feedback…" className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>User</Th>
                  <Th sticky>Category</Th>
                  <Th sticky>Message</Th>
                  <Th sticky>Status</Th>
                  <Th sticky>Date</Th>
                  <Th sticky>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr>
                    <Td colSpan={6} className="py-10 text-center text-slate-500">No feedback yet.</Td>
                  </tr>
                ) : (
                  paginatedItems.map((f) => (
                    <tr key={f._id} className="hover:bg-slate-50/80">
                      <Td>
                        <div className="font-medium text-slate-800">{f.userId?.name || "—"}</div>
                        <div className="text-xs text-slate-500">{f.userId?.email || f.userId?.mobile || ""}</div>
                      </Td>
                      <Td>{f.category}</Td>
                      <Td className="max-w-xs whitespace-pre-wrap text-slate-600">{f.message}</Td>
                      <Td><StatusBadge status={f.status} /></Td>
                      <Td className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleString()}</Td>
                      <Td>
                        <TableActions>
                          {f.status !== "reviewed" ? (
                            <IconActionButton
                              icon={IconCheck}
                              label="Mark as reviewed"
                              onClick={() => setStatus(f._id, "reviewed")}
                            />
                          ) : null}
                          {f.status !== "resolved" ? (
                            <IconActionButton
                              icon={IconCheckCircle}
                              label="Mark as resolved"
                              variant="primary"
                              onClick={() => setStatus(f._id, "resolved")}
                            />
                          ) : null}
                        </TableActions>
                      </Td>
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
