export default function PageHeader({ title, subtitle, children, compact = false }) {
  return (
    <header className={compact ? "shrink-0" : "mb-5 shrink-0"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className={
              compact
                ? "text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl"
                : "text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl"
            }
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-500 lg:text-[15px]">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </header>
  );
}
