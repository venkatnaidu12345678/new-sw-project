export function Alert({ variant = "error", children, className = "" }) {
  const styles =
    variant === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles} ${className}`}>
      {children}
    </div>
  );
}

export function btnClass(variant = "primary", size = "md") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-brand-600 to-accent-violet text-white shadow-md shadow-brand-600/25 hover:opacity-95",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return `${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary}`;
}

export function inputClass(extra = "") {
  return `w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${extra}`;
}

export function tableShellClass(extra = "") {
  return `overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${extra}`;
}

export function Table({ children, className = "" }) {
  return (
    <div className={tableShellClass(className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className = "" }) {
  return (
    <th
      className={`bg-slate-50 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle text-slate-700 ${className}`}>{children}</td>;
}
