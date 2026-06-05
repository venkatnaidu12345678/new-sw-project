export default function Loading({ message = "Loading…", className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 text-slate-500 ${className}`}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
