export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {children ? <div className="toolbar">{children}</div> : null}
      </div>
    </header>
  );
}
