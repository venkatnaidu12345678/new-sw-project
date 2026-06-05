import { useEffect, useState } from "react";
import { getFeedbacks, updateFeedback } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import StatusBadge from "../components/StatusBadge";
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

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="User feedback" subtitle="Messages submitted from the mobile app profile screen" />
      <div className="mb-5 flex flex-wrap gap-2">
        <select className={inputClass("max-w-[200px]")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
        <button type="button" className={btnClass("primary", "sm")} onClick={load}>Refresh</button>
      </div>
      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {loading ? (
        <Loading message="Loading feedback…" />
      ) : feedbacks.length === 0 ? (
        <p className="text-sm text-slate-500">No feedback yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Category</Th>
              <Th>Message</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {feedbacks.map((f) => (
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
                  <div className="flex flex-wrap gap-1.5">
                    {f.status !== "reviewed" ? (
                      <button type="button" className={btnClass("secondary", "sm")} onClick={() => setStatus(f._id, "reviewed")}>Reviewed</button>
                    ) : null}
                    {f.status !== "resolved" ? (
                      <button type="button" className={btnClass("primary", "sm")} onClick={() => setStatus(f._id, "resolved")}>Resolved</button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
