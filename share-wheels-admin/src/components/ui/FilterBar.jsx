/** Toolbar row for search, filters, and action buttons on list pages. */
export default function FilterBar({ children, className = "" }) {
  return (
    <div
      className={`mb-3 flex shrink-0 flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}
