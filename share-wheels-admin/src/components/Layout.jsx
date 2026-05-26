import { NavLink, Outlet, useNavigate } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard", icon: "D", end: true },
  { to: "/users", label: "Users", icon: "U" },
  { to: "/rides", label: "Rides", icon: "R" },
  { to: "/passenger-rides", label: "Passenger Requests", icon: "P" },
  { to: "/couriers", label: "Couriers", icon: "C" },
  { to: "/live-tracking", label: "Live Tracking", icon: "L" },
  { to: "/ads", label: "Ads", icon: "A" },
];

export default function Layout() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <div className="app-brand-row">
            <span className="app-logo">SW</span>
            <div>
              <div className="app-brand-title">Share Wheels</div>
              <div className="app-brand-sub">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="app-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-nav-link ${isActive ? "active" : ""}`.trim()
              }
            >
              <span className="app-nav-icon" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <div className="app-admin-name">{admin.name || "Admin"}</div>
          <div className="app-admin-email">{admin.email || "-"}</div>
          <button type="button" className="btn-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
