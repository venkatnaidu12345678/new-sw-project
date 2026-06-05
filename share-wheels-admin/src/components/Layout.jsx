import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard", icon: "◉", end: true },
  { to: "/users", label: "Users", icon: "👤" },
  { to: "/rides", label: "Rides", icon: "🚗" },
  { to: "/passenger-rides", label: "Passenger Requests", icon: "🧑" },
  { to: "/couriers", label: "Couriers", icon: "📦" },
  { to: "/live-tracking", label: "Live Tracking", icon: "📍" },
  { to: "/ads", label: "Ads", icon: "📣" },
  { to: "/locations", label: "Locations", icon: "🗺" },
  { to: "/lookup-types", label: "Dropdown types", icon: "▤" },
  { to: "/feedback", label: "Feedback", icon: "💬" },
  { to: "/legal", label: "Legal", icon: "⚖" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/login");
  };

  return (
    <div className="flex h-full min-h-screen bg-slate-100">
      <aside className="flex w-[260px] shrink-0 flex-col bg-sidebar text-slate-200 shadow-xl">
        <div className="border-b border-white/10 bg-gradient-to-b from-brand-600/30 to-transparent px-5 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-violet text-sm font-extrabold text-white shadow-lg shadow-brand-600/40">
              SW
            </span>
            <div>
              <div className="text-base font-bold text-white">Share Wheels</div>
              <div className="text-xs text-slate-400">Admin Console</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-brand-600/40 to-accent-violet/25 text-white shadow-inner ring-1 ring-white/10"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")
              }
            >
              <span className="w-5 text-center text-base opacity-90" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 px-5 py-4">
          <div className="truncate text-sm font-semibold text-white">
            {admin.name || "Admin"}
          </div>
          <div className="mb-3 truncate text-xs text-slate-400">{admin.email || "—"}</div>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-slate-600 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={
            isDashboard
              ? "flex h-full flex-col overflow-hidden p-4 lg:p-5"
              : "flex-1 overflow-y-auto p-4 lg:p-6"
          }
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
