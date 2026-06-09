/** Full-height page shell — keeps content inside the admin viewport (no page scroll). */
export default function AdminPageShell({ children, className = "" }) {
  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/** Flex region for table + pagination below filters. */
export function AdminTablePanel({ children, className = "" }) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
