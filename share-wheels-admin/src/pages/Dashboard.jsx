import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getStats } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import StatusBadge from "../components/StatusBadge";
import { Alert, Th, Td } from "../components/ui/primitives";

const STAT_CARDS = [
  {
    key: "totalUsers",
    label: "Total users",
    gradient: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/20",
  },
  {
    key: "verifiedUsers",
    label: "Verified users",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
  },
  {
    key: "activeRides",
    label: "Active rides",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
  },
  {
    key: "startedRides",
    label: "In progress",
    gradient: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/20",
  },
  {
    key: "openPassengerRequests",
    label: "Passenger requests",
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/20",
  },
  {
    key: "openCouriers",
    label: "Open couriers",
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/20",
  },
];

const SUBSCRIPTION_STAT_CARDS = [
  {
    key: "activeSubscriptions",
    label: "Active subs",
    gradient: "from-indigo-500 to-violet-600",
    glow: "shadow-indigo-500/20",
  },
  {
    key: "subscriptionRevenue",
    label: "Sub revenue (₹)",
    gradient: "from-emerald-500 to-green-600",
    glow: "shadow-emerald-500/20",
    format: (v) => (v ?? 0).toLocaleString("en-IN"),
  },
  {
    key: "paidPayments",
    label: "Paid orders",
    gradient: "from-sky-500 to-cyan-600",
    glow: "shadow-sky-500/20",
  },
  {
    key: "totalSubscriptions",
    label: "All subscriptions",
    gradient: "from-fuchsia-500 to-pink-600",
    glow: "shadow-fuchsia-500/20",
  },
];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function DoughnutChart({ title, data, emptyLabel = "No data" }) {
  const rows = (data || []).filter((x) => x.value > 0);
  const chartData = rows.length ? rows : [{ name: emptyLabel, value: 1, color: "#cbd5e1" }];

  return (
    <section className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-2 shrink-0 text-sm font-bold text-slate-800">{title}</h2>
      <div className="min-h-[140px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={rows.length > 1 ? 3 : 0}
            >
              {chartData.map((entry, i) => (
                <Cell key={entry.name || i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        {rows.map((item) => (
          <span key={item.name} className="inline-flex items-center gap-1 text-[11px] text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            {item.name} ({item.value})
          </span>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setSyncing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await getStats();
      setPayload(res);
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const timer = setInterval(() => load(true), 15000);
    return () => clearInterval(timer);
  }, [load]);

  const stats = payload?.stats || {};
  const breakdown = (payload?.rideStatusBreakdown || []).filter((x) => x.value > 0);
  const activity = payload?.activityChart || [];
  const recentRides = payload?.recentRides || [];
  const recentSubscriptions = payload?.recentSubscriptions || [];
  const subscriptionStatusBreakdown = payload?.subscriptionStatusBreakdown || [];
  const subscriptionPlanBreakdown = payload?.subscriptionPlanBreakdown || [];
  const subscriptionPaymentBreakdown = payload?.subscriptionPaymentBreakdown || [];
  const subscriptionTypeBreakdown = payload?.subscriptionTypeBreakdown || [];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading message="Loading live dashboard…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-2">
      <PageHeader
        compact
        title="Live dashboard"
        subtitle="Real-time platform & subscription health — auto-refreshes every 15 seconds."
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ${syncing ? "animate-pulse" : ""}`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live
          </span>
          {lastSync ? (
            <span className="text-xs text-slate-500">
              Updated {lastSync.toLocaleTimeString()}
            </span>
          ) : null}
          <button type="button" onClick={() => load(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Refresh
          </button>
        </div>
      </PageHeader>

      {error ? <Alert className="shrink-0">{error}</Alert> : null}

      <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-2xl bg-gradient-to-br ${card.gradient} p-3 text-white shadow-lg ${card.glow}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold leading-none">
              {stats[card.key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
        {SUBSCRIPTION_STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-2xl bg-gradient-to-br ${card.gradient} p-3 text-white shadow-lg ${card.glow}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold leading-none">
              {card.format ? card.format(stats[card.key]) : stats[card.key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DoughnutChart title="Subscription status" data={subscriptionStatusBreakdown} />
        <DoughnutChart title="Active plans" data={subscriptionPlanBreakdown} emptyLabel="No active plans" />
        <DoughnutChart title="Payment orders" data={subscriptionPaymentBreakdown} />
        <DoughnutChart title="Paid vs free (active)" data={subscriptionTypeBreakdown} />
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Ride status donut */}
        <section className="col-span-12 flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-4">
          <h2 className="mb-2 shrink-0 text-sm font-bold text-slate-800">Ride status mix</h2>
          <div className="h-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown.length ? breakdown : [{ name: "No data", value: 1, color: "#cbd5e1" }]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={3}
                >
                  {(breakdown.length ? breakdown : [{ color: "#cbd5e1" }]).map((entry, i) => (
                    <Cell key={entry.name || i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {breakdown.map((item) => (
              <span key={item.name} className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                {item.name} ({item.value})
              </span>
            ))}
          </div>
        </section>
        <section className="col-span-12 flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-5">
          <h2 className="mb-2 shrink-0 text-sm font-bold text-slate-800">7-day activity</h2>
          <div className="h-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ridesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="subsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Rides" stroke="#3b82f6" fill="url(#ridesGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="users" name="New users" stroke="#10b981" fill="url(#usersGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="subscriptions" name="New subs" stroke="#8b5cf6" fill="url(#subsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Requests bar */}
        <section className="col-span-12 flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-3">
          <h2 className="mb-2 shrink-0 text-sm font-bold text-slate-800">Open pipeline</h2>
          <div className="h-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Passenger", value: stats.openPassengerRequests || 0, fill: "#f59e0b" },
                  { name: "Courier", value: stats.openCouriers || 0, fill: "#f43f5e" },
                  { name: "Pending rides", value: stats.pendingRides || 0, fill: "#8b5cf6" },
                ]}
                margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {[
                    { fill: "#f59e0b" },
                    { fill: "#f43f5e" },
                    { fill: "#8b5cf6" },
                  ].map((c, i) => (
                    <Cell key={i} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-2 py-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Completed</p>
              <p className="text-lg font-extrabold text-emerald-600">{stats.completedRides ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Total rides</p>
              <p className="text-lg font-extrabold text-brand-600">{stats.totalRides ?? 0}</p>
            </div>
          </div>
        </section>

        {/* Recent rides + subscriptions */}
        <section className="col-span-12 flex flex-col lg:col-span-6">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Recent rides</h2>
            <span className="text-xs text-slate-500">{recentRides.length} records</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="max-h-[320px] overflow-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <Th>Route</Th>
                    <Th>Driver</Th>
                    <Th>Status</Th>
                    <Th>Updated</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentRides.length === 0 ? (
                    <tr>
                      <Td className="py-8 text-center text-slate-500" colSpan={4}>
                        No rides yet
                      </Td>
                    </tr>
                  ) : (
                    recentRides.map((ride) => (
                      <tr key={ride.id} className="hover:bg-slate-50/80">
                        <Td>
                          <div className="font-semibold text-slate-800">{ride.from}</div>
                          <div className="text-xs text-slate-500">→ {ride.to}</div>
                        </Td>
                        <Td>{ride.driver}</Td>
                        <Td>
                          <StatusBadge status={ride.status} />
                        </Td>
                        <Td className="text-xs text-slate-500">
                          {ride.updatedAt
                            ? new Date(ride.updatedAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="col-span-12 flex flex-col lg:col-span-6">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Recent subscriptions</h2>
            <span className="text-xs text-slate-500">{recentSubscriptions.length} records</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="max-h-[320px] overflow-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <Th>Driver</Th>
                    <Th>Plan</Th>
                    <Th>Status</Th>
                    <Th>Amount</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentSubscriptions.length === 0 ? (
                    <tr>
                      <Td className="py-8 text-center text-slate-500" colSpan={4}>
                        No subscriptions yet
                      </Td>
                    </tr>
                  ) : (
                    recentSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        <Td>
                          <div className="font-semibold text-slate-800">{sub.user}</div>
                          {sub.email ? (
                            <div className="text-xs text-slate-500">{sub.email}</div>
                          ) : null}
                        </Td>
                        <Td>
                          <div>{sub.plan}</div>
                          {sub.isFree ? (
                            <span className="text-[10px] font-semibold uppercase text-emerald-600">Free</span>
                          ) : null}
                        </Td>
                        <Td>
                          <StatusBadge status={sub.status} />
                        </Td>
                        <Td className="text-xs text-slate-600">
                          {sub.isFree ? "—" : `₹${(sub.amountPaid ?? 0).toLocaleString("en-IN")}`}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
