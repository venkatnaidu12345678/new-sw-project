import { useEffect, useMemo, useState, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useTheme } from "../context/ThemeContext";
import AdminLogo from "./AdminLogo";
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
  IconLogout,
  IconShieldCheck,
  IconSun,
  IconMoon,
} from "./ui/icons";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: IconDashboard, end: true, module: "dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { to: "/users", label: "Users", icon: IconUsers, module: "users" },
      { to: "/rides", label: "Rides", icon: IconCar, module: "rides" },
      { to: "/passenger-rides", label: "Passenger Requests", icon: IconPassenger, module: "passenger_rides" },
      { to: "/couriers", label: "Couriers", icon: IconPackage, module: "couriers" },
      { to: "/live-tracking", label: "Live Tracking", icon: IconMapPin, module: "live_tracking" },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/ads", label: "Ads", icon: IconMegaphone, module: "ads" },
      { to: "/feedback", label: "Feedback", icon: IconChat, module: "feedback" },
      { to: "/legal", label: "Legal", icon: IconScale, module: "legal" },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/locations", label: "Locations", icon: IconMap, module: "locations" },
      { to: "/lookup-types", label: "Dropdown types", icon: IconList, module: "lookup_types" },
      { to: "/subscription-plans", label: "Driver plans", icon: IconList, module: "subscription_plans" },
      { to: "/subscribed-users", label: "Subscribed users", icon: IconUsers, module: "subscribed_users" },
      { to: "/subscription-payments", label: "Plan payments", icon: IconList, module: "subscription_payments" },
      { to: "/vehicle-fares", label: "Vehicle fares", icon: IconList, module: "vehicle_fares" },
      { to: "/admin-staff", label: "Admin staff", icon: IconShieldCheck, module: "admin_staff" },
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
  "/subscription-plans": "Driver plans",
  "/subscribed-users": "Subscribed users",
  "/subscription-payments": "Plan payments",
  "/vehicle-fares": "Vehicle fares",
  "/admin-staff": "Admin staff",
};

function getPageTitle(pathname) {
  return ROUTE_TITLES[pathname] || "Admin";
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, setAdmin, canView, isSuperAdmin } = useAdminAuth();
  const { isDark, toggleTheme } = useTheme();
  const isDashboard = location.pathname === "/";
  const isWidePage = location.pathname === "/live-tracking";
  const pageTitle = getPageTitle(location.pathname);

  const visibleNavGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canView(item.module)),
      })).filter((group) => group.items.length > 0),
    [canView]
  );

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
    setAdmin(null);
    navigate("/login");
  };

  const toggleSideMenu = useCallback(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarCollapsed((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }, []);

  const initials = (admin?.name || "Admin")
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
        <AdminLogo className="h-11 w-11" />
        {!sidebarCollapsed ? (
          <div className="min-w-0 sidebar-enter">
            <div className="truncate text-base font-bold text-white">Share Wheels</div>
            <div className="text-xs text-indigo-200/70">Admin Console</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {visibleNavGroups.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed ? (
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-indigo-200/55">
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
                          ? "bg-white/15 text-white shadow-md shadow-black/20 ring-1 ring-white/20 backdrop-blur-sm"
                          : "text-indigo-100/70 hover:bg-white/10 hover:text-white",
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
            <div className="truncate text-sm font-semibold text-white">{admin?.name || "Admin"}</div>
            <div className="truncate text-xs text-slate-400">{admin?.email || "—"}</div>
            {isSuperAdmin ? (
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                Super admin
              </div>
            ) : null}
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
    <div className="flex h-screen max-h-[100dvh] overflow-hidden bg-canvas">
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
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden text-slate-200 shadow-2xl shadow-brand-950/30 transition-all duration-300 ease-out lg:static lg:translate-x-0",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-600 via-brand-700 to-[#312e81]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 top-8 h-52 w-52 rounded-full bg-accent-cyan/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-28 h-64 w-64 rounded-full bg-accent-violet/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.1),transparent_50%)]"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{navContent}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl lg:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={toggleSideMenu}
            aria-label="Toggle side menu"
            aria-expanded={mobileOpen || !sidebarCollapsed}
          >
            <IconMenu />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Share Wheels
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex dark:border-slate-700 dark:bg-slate-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Live</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet text-xs font-bold text-white">
                {initials}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{admin?.name || "Admin"}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{admin?.email || ""}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              isDashboard
                ? "flex min-h-0 flex-1 flex-col overflow-y-auto p-4 scrollbar-thin lg:p-5"
                : "flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-5"
            }
          >
            <div
              className={`page-enter mx-auto flex w-full flex-col ${
                isDashboard ? "min-h-0 flex-1" : "h-full min-h-0"
              } ${isWidePage ? "max-w-[1600px]" : "max-w-7xl"}`}
            >
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
