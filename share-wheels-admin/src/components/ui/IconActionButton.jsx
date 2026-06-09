import { btnClass } from "./primitives";

/** Compact icon-only action button for table rows (includes tooltip via title). */
export default function IconActionButton({
  icon: Icon,
  label,
  variant = "secondary",
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`${btnClass(variant, "sm")} !px-2 !py-2 ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Horizontal group of icon action buttons in a table cell. */
export function TableActions({ children, className = "" }) {
  return <div className={`flex flex-wrap items-center gap-1 ${className}`}>{children}</div>;
}
