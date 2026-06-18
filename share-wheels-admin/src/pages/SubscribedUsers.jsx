import { useEffect, useState } from "react";
import {
  getSubscribedUsers,
  getSubscriptionPlans,
  assignUserSubscriptionPlan,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import FilterBar from "../components/ui/FilterBar";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import IconActionButton, { TableActions } from "../components/ui/IconActionButton";
import { IconEdit } from "../components/ui/icons";
import {
  Alert,
  btnClass,
  inputClass,
  ModalBackdrop,
  Table,
  Th,
  Td,
} from "../components/ui/primitives";

const STATUS_OPTIONS = ["all", "active", "expired", "cancelled"];

function SubStatusBadge({ sub }) {
  const active = sub?.isActive;
  const label = sub?.isActive ? "Active" : sub?.deactivationReason?.replace(/_/g, " ") || sub?.status || "—";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        active
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80"
      }`}
    >
      {active ? "Active" : label}
    </span>
  );
}

export default function SubscribedUsers() {
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    getSubscribedUsers(params)
      .then((res) => setRows(res.subscriptions || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getSubscriptionPlans({ isActive: "true" })
      .then((res) => setPlans(res.plans || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [statusFilter]);

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(rows, {
    resetDeps: [statusFilter, search],
  });

  const openAssign = (row) => {
    setAssignTarget(row);
    setAssignPlanId(plans[0]?._id || plans[0]?.id || "");
  };

  const submitAssign = async () => {
    if (!assignTarget?.user?._id && !assignTarget?.user?.id) return;
    if (!assignPlanId) {
      alert("Select a plan");
      return;
    }
    setAssigning(true);
    try {
      const userId = assignTarget.user._id || assignTarget.user.id;
      await assignUserSubscriptionPlan(userId, assignPlanId);
      setAssignTarget(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Subscribed drivers"
        subtitle="Driver subscription records — assign or upgrade plans manually"
      />
      <FilterBar>
        <input
          className={inputClass("max-w-xs")}
          placeholder="Search name, email, mobile…"
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
          <Loading message="Loading subscriptions…" className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>User</Th>
                  <Th sticky>Plan</Th>
                  <Th sticky>Status</Th>
                  <Th sticky>Picks</Th>
                  <Th sticky>Expires</Th>
                  <Th sticky>Paid</Th>
                  <Th sticky>Source</Th>
                  <Th sticky>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {totalItems === 0 ? (
                  <tr>
                    <Td colSpan={8} className="py-10 text-center text-slate-500">
                      No subscription records found.
                    </Td>
                  </tr>
                ) : (
                  paginatedItems.map((row) => {
                    const sub = row.subscription || {};
                    const picks = sub.unlimitedPicks
                      ? "Unlimited"
                      : `${sub.picksUsed ?? 0} / ${sub.enroutePickLimit ?? "—"}`;
                    return (
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
                          <div className="font-medium">{row.plan?.name || sub.plan?.name || "—"}</div>
                          <div className="text-xs text-slate-500">
                            {row.plan?.isFree || sub.isFree ? "Free" : `₹${row.plan?.amount ?? sub.plan?.amount ?? 0}`}
                          </div>
                        </Td>
                        <Td>
                          <SubStatusBadge sub={sub} />
                        </Td>
                        <Td className="text-sm">{picks}</Td>
                        <Td className="text-xs text-slate-600">
                          {sub.expiresAt
                            ? new Date(sub.expiresAt).toLocaleString()
                            : "—"}
                        </Td>
                        <Td className="text-sm">₹{row.amountPaid ?? 0}</Td>
                        <Td className="text-xs text-slate-500">
                          {row.razorpayPaymentId
                            ? "Razorpay"
                            : row.assignedByAdmin
                              ? "Admin"
                              : "App"}
                        </Td>
                        <Td>
                          <TableActions>
                            <IconActionButton
                              icon={IconEdit}
                              label="Assign plan"
                              onClick={() => openAssign(row)}
                            />
                          </TableActions>
                        </Td>
                      </tr>
                    );
                  })
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

      {assignTarget ? (
        <ModalBackdrop onClose={() => !assigning && setAssignTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Assign driver plan</h3>
            <p className="mt-1 text-sm text-slate-600">
              User: <strong>{assignTarget.user?.name}</strong> — cancels any current active plan and
              activates the selected plan immediately.
            </p>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Plan</label>
            <select
              className={inputClass("mt-1 w-full")}
              value={assignPlanId}
              onChange={(e) => setAssignPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.isFree ? "(Free)" : `(₹${p.amount})`}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnClass("secondary")}
                disabled={assigning}
                onClick={() => setAssignTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={btnClass("primary")}
                disabled={assigning}
                onClick={submitAssign}
              >
                {assigning ? "Assigning…" : "Assign plan"}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      ) : null}
    </AdminPageShell>
  );
}
