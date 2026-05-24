import { NavLink, Outlet, useNavigate } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/users", label: "Users" },
  { to: "/rides", label: "Rides" },
  { to: "/passenger-rides", label: "Passenger Requests" },
  { to: "/couriers", label: "Couriers" },
  { to: "/live-tracking", label: "Live Tracking" },
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
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.logo}>SW</span>
          <div>
            <div style={styles.brandTitle}>Share Wheels</div>
            <div style={styles.brandSub}>Admin Panel</div>
          </div>
        </div>
        <nav style={styles.nav}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navActive : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={styles.footer}>
          <div style={styles.adminName}>{admin.name || "Admin"}</div>
          <div style={styles.adminEmail}>{admin.email}</div>
          <button type="button" style={styles.logoutBtn} onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell: { display: "flex", minHeight: "100vh" },
  sidebar: {
    width: 260,
    background: "#0f172a",
    color: "#e2e8f0",
    display: "flex",
    flexDirection: "column",
    padding: 24,
  },
  brand: { display: "flex", gap: 12, alignItems: "center", marginBottom: 32 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 16,
  },
  brandTitle: { fontWeight: 700, fontSize: 16 },
  brandSub: { fontSize: 12, color: "#94a3b8" },
  nav: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  navLink: {
    padding: "10px 14px",
    borderRadius: 8,
    color: "#cbd5e1",
    fontSize: 14,
  },
  navActive: { background: "#1e293b", color: "#fff", fontWeight: 600 },
  footer: { borderTop: "1px solid #334155", paddingTop: 16 },
  adminName: { fontWeight: 600, fontSize: 14 },
  adminEmail: { fontSize: 12, color: "#94a3b8", marginBottom: 12 },
  logoutBtn: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #475569",
    background: "transparent",
    color: "#e2e8f0",
  },
  main: { flex: 1, padding: 32, overflow: "auto" },
};
