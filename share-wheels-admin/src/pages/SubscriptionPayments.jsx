import { useEffect, useState } from "react";
import { getSubscriptionPayments } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import { Alert, btnClass, inputClass, Table, Th, Td } from "../components/ui/primitives";

const STATUS_OPTIONS = ["all", "created", "paid", "failed", "expired"];

function PaymentStatusBadge({ status }) {
  const styles = {
    paid: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
    created: "bg-amber-100 text-amber-800 ring-amber-200/80",
    failed: "bg-red-100 text-red-800 ring-red-200/80",
    expired: "bg-slate-100 text-slate-600 ring-slate-200/80",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${
        styles[status] || styles.expired
      }`}
    >
      {status || "—"}
    </span>
  );
}

export default function SubscriptionPayments() {
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    getSubscriptionPayments(params)
      .then((res) => setPayments(res.payments || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(
    payments,
    { resetDeps: [statusFilter, search] }
  );

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Subscription payments"
        subtitle="Razorpay driver plan orders with user details"
      />
      <FilterBar>
        <input
          className={inputClass("max-w-xs")}
          placeholder="Search user name, email, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className={inputClass("max-w-[180px]")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <button type="button" className={btnClass("primary", "sm")} onClick={load}>
          Search / Refresh
        </button>
      </FilterBar>
      {error ? <Alert className="mb-3 shrink-0">{error}</Alert> : null}

      <AdminTablePanel>
        {loading ? (
          <Loading message="Loading payments…" className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>User</Th>
                  <Th sticky>Plan</Th>
                  <Th sticky>Amount</Th>
                  <Th sticky>Status</Th>
                  <Th sticky>Razorpay order</Th>
                  <Th sticky>Payment ID</Th>
                  <Th sticky>Date</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr>
                    <Td colSpan={7} className="py-10 text-center text-slate-500">
                      No payment records found.
                    </Td>
                  </tr>
                ) : (
                  paginatedItems.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <Td>
                        <div className="font-medium text-slate-800">{row.user?.name || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {row.user?.email || row.user?.mobile || ""}
                        </div>
                        {row.user?.userNo ? (
                          <div className="text-[10px] text-slate-400">#{row.user.userNo}</div>
                        ) : null}
                      </Td>
                      <Td>
                        <div className="font-medium">{row.plan?.name || "—"}</div>
                        <div className="text-xs text-slate-500">{row.plan?.slug || ""}</div>
                      </Td>
                      <Td className="font-semibold text-slate-800">
                        ₹{row.amount} {row.currency || "INR"}
                      </Td>
                      <Td>
                        <PaymentStatusBadge status={row.status} />
                      </Td>
                      <Td className="max-w-[140px] truncate font-mono text-[11px] text-slate-600">
                        {row.razorpayOrderId || "—"}
                      </Td>
                      <Td className="max-w-[140px] truncate font-mono text-[11px] text-slate-600">
                        {row.razorpayPaymentId || "—"}
                      </Td>
                      <Td className="text-xs text-slate-500">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
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
