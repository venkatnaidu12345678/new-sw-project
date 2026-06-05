const STYLES = {
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  started: "bg-blue-100 text-blue-800 ring-blue-200",
  in_progress: "bg-blue-100 text-blue-800 ring-blue-200",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
  rejected: "bg-rose-100 text-rose-800 ring-rose-200",
  expired: "bg-slate-100 text-slate-600 ring-slate-200",
  active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
  new: "bg-amber-100 text-amber-800 ring-amber-200",
  reviewed: "bg-blue-100 text-blue-800 ring-blue-200",
  resolved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

export default function StatusBadge({ status }) {
  const key = (status || "pending").toLowerCase().replace(/\s/g, "_");
  const style = STYLES[key] || STYLES.pending;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ring-1 ring-inset ${style}`}
    >
      {status || "pending"}
    </span>
  );
}
