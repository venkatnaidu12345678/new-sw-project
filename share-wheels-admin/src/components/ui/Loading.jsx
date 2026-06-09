export default function Loading({ message = "Loading…", className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-16 text-slate-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-11 w-11">
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-brand-50" />
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
