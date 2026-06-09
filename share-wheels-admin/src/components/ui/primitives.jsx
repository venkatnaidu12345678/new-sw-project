export function Alert({ variant = "error", children, className = "" }) {
  const styles =
    variant === "error"
      ? "border-rose-200/80 bg-rose-50 text-rose-800"
      : variant === "success"
        ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
        : "border-blue-200/80 bg-blue-50 text-blue-800";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${styles} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
}

export function btnClass(variant = "primary", size = "md") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-brand-600 to-accent-violet text-white shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/25 hover:brightness-105",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
    ghost:
      "border border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800",
    danger:
      "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
  };
  return `${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary}`;
}

export function inputClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 ${extra}`;
}

export function cardClass(extra = "") {
  return `rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${extra}`;
}

export function tableShellClass(extra = "") {
  return `flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${extra}`;
}

export function Table({ children, className = "", fill = false }) {
  return (
    <div className={tableShellClass(`${fill ? "min-h-0 flex-1" : ""} ${className}`)}>
      <div className={`overflow-x-auto scrollbar-thin ${fill ? "min-h-0 flex-1 overflow-y-auto" : ""}`}>
        <table className="min-w-full divide-y divide-slate-100 text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className = "", sticky = false }) {
  return (
    <th
      className={`bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 ${sticky ? "sticky top-0 z-10 backdrop-blur-sm" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "", colSpan }) {
  return (
    <td colSpan={colSpan} className={`px-4 py-2.5 align-middle text-slate-700 ${className}`}>
      {children}
    </td>
  );
}

export function ModalBackdrop({ onClose, children, size = "md" }) {
  const sizes = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    "3xl": "max-w-3xl",
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-[page-enter_0.2s_ease-out_both]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`max-h-[90vh] w-full ${sizes[size] || sizes.md} overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl scrollbar-thin`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
