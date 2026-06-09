import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  IconDashboard,
  IconUsers,
  IconCar,
  IconPassenger,
  IconPackage,
  IconMapPin,
  IconMegaphone,
  IconMap,
  IconList,
  IconChat,
  IconScale,
  IconMenu,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
} from "./ui/icons";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: IconDashboard, end: true }],
  },
  {
    label: "Operations",
    items: [
      { to: "/users", label: "Users", icon: IconUsers },
      { to: "/rides", label: "Rides", icon: IconCar },
      { to: "/passenger-rides", label: "Passenger Requests", icon: IconPassenger },
      { to: "/couriers", label: "Couriers", icon: IconPackage },
      { to: "/live-tracking", label: "Live Tracking", icon: IconMapPin },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/ads", label: "Ads", icon: IconMegaphone },
      { to: "/feedback", label: "Feedback", icon: IconChat },
      { to: "/legal", label: "Legal", icon: IconScale },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/locations", label: "Locations", icon: IconMap },
      { to: "/lookup-types", label: "Dropdown types", icon: IconList },
    ],
  },
];

const ROUTE_TITLES = {
  "/": "Dashboard",
  "/users": "Users",
  "/rides": "Rides",
  "/passenger-rides": "Passenger Requests",
  "/couriers": "Couriers",
  "/live-tracking": "Live Tracking",
  "/ads": "Ads",
  "/locations": "Locations",
  "/lookup-types": "Dropdown types",
  "/feedback": "Feedback",
  "/legal": "Legal",
};

function getPageTitle(pathname) {
  return ROUTE_TITLES[pathname] || "Admin";
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const isWidePage = location.pathname === "/live-tracking";
  const admin = JSON.parse(localStorage.getItem("admin") || "{}");
  const pageTitle = getPageTitle(location.pathname);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/login");
  };

  const initials = (admin.name || "Admin")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarWidth = sidebarCollapsed ? "w-[76px]" : "w-[260px]";

  const navContent = (
    <>
      <div
        className={`flex shrink-0 items-center gap-3 border-b border-white/8 px-4 py-5 ${sidebarCollapsed ? "justify-center px-2" : ""}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-violet text-sm font-extrabold text-white shadow-lg shadow-brand-600/30">
          SW
        </span>
        {!sidebarCollapsed ? (
          <div className="min-w-0 sidebar-enter">
            <div className="truncate text-base font-bold text-white">Share Wheels</div>
            <div className="text-xs text-slate-400">Admin Console</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed ? (
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            ) : (
              <div className="mb-2 h-px bg-white/8" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        sidebarCollapsed ? "justify-center px-2" : "",
                        isActive
                          ? "bg-gradient-to-r from-brand-600/90 to-accent-violet/70 text-white shadow-md shadow-brand-900/30 ring-1 ring-white/10"
                          : "text-slate-400 hover:bg-sidebar-hover hover:text-white",
                      ].join(" ")
                    }
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${sidebarCollapsed ? "" : ""}`}
                    />
                    {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-white/8 p-3 ${sidebarCollapsed ? "px-2" : ""}`}>
        {!sidebarCollapsed ? (
          <div className="mb-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="truncate text-sm font-semibold text-white">{admin.name || "Admin"}</div>
            <div className="truncate text-xs text-slate-400">{admin.email || "—"}</div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={logout}
          title="Log out"
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white ${sidebarCollapsed ? "px-2" : ""}`}
        >
          <IconLogout className="h-4 w-4" />
          {!sidebarCollapsed ? "Log out" : null}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-screen bg-canvas">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-slate-200 shadow-2xl transition-all duration-300 ease-out lg:static lg:translate-x-0",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {navContent}

        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 lg:flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <IconChevronRight className="h-3.5 w-3.5" />
          ) : (
            <IconChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl lg:px-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Share Wheels
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600">Live</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet text-xs font-bold text-white">
                {initials}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-800">{admin.name || "Admin"}</p>
                <p className="truncate text-[11px] text-slate-500">{admin.email || ""}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              isDashboard
                ? "flex h-full flex-col overflow-hidden p-4 lg:p-5"
                : "flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-5"
            }
          >
            <div
              className={`page-enter mx-auto flex h-full min-h-0 w-full flex-col ${isWidePage ? "max-w-[1600px]" : "max-w-7xl"}`}
            >
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
