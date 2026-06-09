export default function PageHeader({ title, subtitle, children, compact = false, hideTitle = false }) {
  if (hideTitle) {
    return children ? (
      <header className={`flex shrink-0 flex-wrap items-center justify-end gap-2 ${compact ? "" : "mb-3"}`}>
        {children}
      </header>
    ) : null;
  }

  return (
    <header className={`shrink-0 ${compact ? "mb-2" : "mb-4"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className={
              compact
                ? "text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl"
                : "text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl"
            }
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={`mt-1 max-w-2xl text-slate-500 ${compact ? "line-clamp-1 text-xs lg:text-sm" : "text-sm leading-relaxed lg:text-[15px]"}`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </header>
  );
}
