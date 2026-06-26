import { useEffect, useMemo, useState } from "react";
import {
  getSubscriptionPlans,
  getSubscriptionPlansMeta,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import IconActionButton, { TableActions } from "../components/ui/IconActionButton";
import { IconEdit, IconPause, IconPlay, IconTrash } from "../components/ui/icons";
import {
  Alert,
  btnClass,
  cardClass,
  inputClass,
  ModalBackdrop,
  Table,
  Th,
  Td,
} from "../components/ui/primitives";

const emptyPaidForm = {
  name: "",
  slug: "",
  description: "",
  isFree: false,
  amount: 0,
  currency: "INR",
  periodValue: 30,
  periodUnit: "days",
  enroutePickLimit: 10,
  unlimitedPicks: false,
  isActive: true,
};

const emptyFreeForm = {
  name: "Free Plan",
  slug: "free",
  description: "",
  isFree: true,
  periodValue: 30,
  periodUnit: "days",
  enroutePickLimit: 5,
  unlimitedPicks: false,
  isActive: true,
};

const formatPeriod = (plan) => {
  if (!plan?.periodValue) return "—";
  const unit = plan.periodUnit === "months" ? "month(s)" : "day(s)";
  return `${plan.periodValue} ${unit}`;
};

const formatPickLimit = (plan) => {
  if (plan?.unlimitedPicks) return "Unlimited enroute pickups";
  if (plan?.enroutePickLimit) return `${plan.enroutePickLimit} enroute pickups`;
  return "—";
};

const formatPrice = (plan) => {
  if (plan?.isFree || plan?.amount === 0) return "Free";
  return `₹${plan.amount} ${plan.currency || "INR"}`;
};

function StatCard({ label, value, hint, accent = "brand" }) {
  const accents = {
    brand:
      "from-brand-500/10 to-accent-violet/5 border-brand-200/60 dark:from-brand-500/15 dark:to-accent-violet/10 dark:border-brand-800/50",
    emerald:
      "from-emerald-500/10 to-teal-500/5 border-emerald-200/60 dark:from-emerald-500/15 dark:to-teal-500/10 dark:border-emerald-800/50",
    amber:
      "from-amber-500/10 to-orange-500/5 border-amber-200/60 dark:from-amber-500/15 dark:to-orange-500/10 dark:border-amber-800/50",
    violet:
      "from-violet-500/10 to-fuchsia-500/5 border-violet-200/60 dark:from-violet-500/15 dark:to-fuchsia-500/10 dark:border-violet-800/50",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm dark:shadow-slate-950/20 ${accents[accent] || accents.brand}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        active
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/60"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {active ? "Active" : "Paused"}
    </span>
  );
}

function PlanTypeBadge({ isFree }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        isFree
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/60"
          : "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900/60"
      }`}
    >
      {isFree ? "Free · one-time trial" : "Paid · Razorpay"}
    </span>
  );
}

function PickupBadge({ plan }) {
  if (plan?.unlimitedPicks) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60">
        <span>∞</span> Unlimited enroute pickups
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60">
      {plan?.enroutePickLimit ?? "—"} enroute pickups
    </span>
  );
}

function FormSection({ title, hint, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <span className="mb-1.5 block">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{children}</span>
      {hint ? (
        <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </span>
  );
}

function PickLimitFields({ form, setField, inputClassName, fieldId = "plan" }) {
  const mode = form.unlimitedPicks ? "unlimited" : "limited";
  const radioName = `enroutePickMode-${fieldId}`;

  const setMode = (next) => {
    setField("unlimitedPicks", next === "unlimited");
  };

  const optionClass = (selected) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-200 ${
      selected
        ? "border-brand-400 bg-brand-50/80 shadow-sm ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/40 dark:ring-brand-500/30"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:border-slate-500 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="grid gap-3 sm:grid-cols-1">
      <label className={optionClass(mode === "unlimited")}>
        <input
          type="radio"
          name={radioName}
          className="mt-1"
          checked={mode === "unlimited"}
          onChange={() => setMode("unlimited")}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              ∞
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Unlimited enroute pickups
            </span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Driver can pick any number of enroute passengers and couriers until the plan expires.
          </span>
        </span>
      </label>

      <label className={optionClass(mode === "limited")}>
        <input
          type="radio"
          name={radioName}
          className="mt-1"
          checked={mode === "limited"}
          onChange={() => setMode("limited")}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              #
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Fixed enroute pickup count
            </span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Total enroute passengers and couriers a driver can pick during this billing period.
          </span>
          {mode === "limited" ? (
            <input
              type="number"
              min="1"
              className={`${inputClassName} mt-3 max-w-[140px]`}
              value={form.enroutePickLimit}
              onChange={(e) => setField("enroutePickLimit", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              required
            />
          ) : null}
        </span>
      </label>
    </div>
  );
}

function PlanPreviewPanel({ form }) {
  const period = `${form.periodValue || "—"} ${form.periodUnit || "days"}`;
  const pickup = form.unlimitedPicks
    ? "Unlimited enroute pickups"
    : `${form.enroutePickLimit || "—"} enroute pickups`;
  const price = form.isFree ? "Free" : `₹${form.amount || 0}`;

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-brand-50/50 p-4 dark:border-violet-800/50 dark:from-violet-950/30 dark:to-brand-950/20">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">👁️</span>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Driver preview</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">How this plan appears in the mobile app</p>
        </div>
      </div>
      <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {form.name || "Plan name"}
            </p>
            <p className="mt-0.5 text-lg font-bold text-brand-600 dark:text-brand-400">
              {price}
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {" "}
                / {period}
              </span>
            </p>
          </div>
          <PlanTypeBadge isFree={form.isFree} />
        </div>
        {form.description ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {form.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {period}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              form.unlimitedPicks
                ? "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
            }`}
          >
            {pickup}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [meta, setMeta] = useState({ periodUnits: ["days", "months"] });
  const [form, setForm] = useState(emptyPaidForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getSubscriptionPlans()
      .then((res) => setPlans(res.plans || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getSubscriptionPlansMeta().then(setMeta).catch(() => {});
    load();
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const existingFreePlan = plans.find((p) => p.isFree);

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.isActive !== false).length;
    const paid = plans.filter((p) => !p.isFree).length;
    const freeActive = existingFreePlan?.isActive !== false;
    return {
      total: plans.length,
      active,
      paid,
      freeConfigured: !!existingFreePlan,
      freeActive,
    };
  }, [plans, existingFreePlan]);

  const openCreate = (free = false) => {
    if (free && existingFreePlan) {
      openEdit(existingFreePlan);
      setError(
        "A free plan already exists — edit it below to change duration or enroute pickup allowance."
      );
      return;
    }
    setEditingId(null);
    setForm(free ? { ...emptyFreeForm } : { ...emptyPaidForm });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditingId(plan._id);
    const shared = {
      periodValue: plan.periodValue ?? 30,
      periodUnit: plan.periodUnit || "days",
      enroutePickLimit: plan.enroutePickLimit ?? 5,
      unlimitedPicks: !!plan.unlimitedPicks,
      isActive: plan.isActive !== false,
    };

    if (plan.isFree) {
      setForm({
        name: plan.name || "Free Plan",
        slug: plan.slug || "free",
        description: plan.description || "",
        isFree: true,
        ...shared,
      });
    } else {
      setForm({
        name: plan.name || "",
        slug: plan.slug || "",
        description: plan.description || "",
        isFree: false,
        amount: plan.amount ?? 0,
        currency: plan.currency || "INR",
        ...shared,
      });
    }
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setError("");
  };

  const buildPayload = () => {
    const shared = {
      periodValue: Number(form.periodValue) || 1,
      periodUnit: form.periodUnit || "days",
      unlimitedPicks: !!form.unlimitedPicks,
      isActive: !!form.isActive,
    };

    if (!form.unlimitedPicks) {
      shared.enroutePickLimit = Number(form.enroutePickLimit) || 1;
    }

    if (form.isFree) {
      return {
        name: form.name || "Free Plan",
        slug: form.slug || "free",
        description: form.description || "",
        isFree: true,
        ...shared,
      };
    }

    return {
      name: form.name,
      slug: form.slug,
      description: form.description || "",
      isFree: false,
      amount: Number(form.amount) || 0,
      currency: form.currency || "INR",
      ...shared,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();

      if (editingId) {
        await updateSubscriptionPlan(editingId, payload);
      } else {
        await createSubscriptionPlan(payload);
      }
      setModalOpen(false);
      setEditingId(null);
      load();
    } catch (err) {
      const msg = err.message || "Could not save plan";
      setError(msg);
      if (/already exists/i.test(msg) && existingFreePlan && form.isFree && !editingId) {
        openEdit(existingFreePlan);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan) => {
    setSaving(true);
    setError("");
    try {
      await updateSubscriptionPlan(plan._id, { isActive: !plan.isActive });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      await deleteSubscriptionPlan(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modalTitle = editingId
    ? `Edit ${form.isFree ? "free" : "paid"} plan`
    : form.isFree
      ? "Create free plan"
      : "Create paid plan";

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Driver subscription plans"
        subtitle="Configure duration and enroute pickup allowance — unlimited or a fixed count — for free and paid driver plans."
      >
        <button type="button" className={btnClass("primary", "sm")} onClick={() => openCreate(false)}>
          + Add paid plan
        </button>
        <button
          type="button"
          className={btnClass("secondary", "sm")}
          onClick={() => (existingFreePlan ? openEdit(existingFreePlan) : openCreate(true))}
        >
          {existingFreePlan ? "Edit free plan" : "+ Add free plan"}
        </button>
        <button type="button" className={btnClass("ghost", "sm")} onClick={load}>
          Refresh
        </button>
      </PageHeader>

      {error && !modalOpen && !deleteTarget ? <Alert variant="error">{error}</Alert> : null}

      <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total plans" value={stats.total} hint="Free + paid configured" accent="brand" />
        <StatCard label="Active" value={stats.active} hint="Visible to drivers" accent="emerald" />
        <StatCard
          label="Free plan"
          value={stats.freeConfigured ? (stats.freeActive ? "Ready" : "Paused") : "Missing"}
          hint={
            stats.freeConfigured
              ? "Auto-assigned once to new drivers"
              : "Create a default free trial plan"
          }
          accent="emerald"
        />
        <StatCard label="Paid plans" value={stats.paid} hint="Razorpay checkout" accent="violet" />
      </div>

      <AdminTablePanel>
        {loading ? (
          <Loading />
        ) : plans.length === 0 ? (
          <div
            className={`${cardClass()} flex flex-col items-center justify-center px-6 py-16 text-center`}
          >
            <span className="mb-4 text-5xl">🎫</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No driver plans yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Start with a free trial plan for new drivers, then add paid plans with Razorpay billing.
              Each plan controls duration and enroute pickup limits.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" className={btnClass("primary")} onClick={() => openCreate(true)}>
                Create free plan
              </button>
              <button type="button" className={btnClass("secondary")} onClick={() => openCreate(false)}>
                Create paid plan
              </button>
            </div>
          </div>
        ) : (
          <Table fill>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Price</Th>
                <Th>Period</Th>
                <Th>Pickups</Th>
                <Th>Status</Th>
                <Th>Description</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr
                  key={plan._id}
                  className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                    plan.isActive === false ? "opacity-75" : ""
                  }`}
                >
                  <Td>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{plan.slug || "—"}</div>
                  </Td>
                  <Td>
                    <PlanTypeBadge isFree={plan.isFree} />
                  </Td>
                  <Td>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatPrice(plan)}
                    </span>
                  </Td>
                  <Td>{formatPeriod(plan)}</Td>
                  <Td>
                    <PickupBadge plan={plan} />
                  </Td>
                  <Td>
                    <StatusBadge active={plan.isActive !== false} />
                  </Td>
                  <Td className="max-w-[220px]">
                    {plan.description ? (
                      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                        {plan.description}
                      </p>
                    ) : (
                      <span className="text-sm italic text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <TableActions>
                      <IconActionButton label="Edit" icon={IconEdit} onClick={() => openEdit(plan)} />
                      <IconActionButton
                        label={plan.isActive !== false ? "Deactivate" : "Activate"}
                        icon={plan.isActive !== false ? IconPause : IconPlay}
                        onClick={() => handleToggleActive(plan)}
                        disabled={saving}
                      />
                      {!plan.isFree ? (
                        <IconActionButton
                          label="Delete"
                          icon={IconTrash}
                          variant="danger"
                          onClick={() => setDeleteTarget(plan)}
                          disabled={saving}
                        />
                      ) : null}
                    </TableActions>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AdminTablePanel>

      {modalOpen ? (
        <ModalBackdrop onClose={closeModal} size="3xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                  form.isFree
                    ? "bg-emerald-100 dark:bg-emerald-950/50"
                    : "bg-violet-100 dark:bg-violet-950/50"
                }`}
              >
                {form.isFree ? "🎁" : "💳"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{modalTitle}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Set duration and enroute pickup allowance.
                  {form.isFree
                    ? " Assigned once to new drivers — not renewable."
                    : " Drivers pay via Razorpay to activate."}
                </p>
              </div>
              <PlanTypeBadge isFree={form.isFree} />
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
              <div className="space-y-4 lg:col-span-3">
                <FormSection title="Plan details" hint="Name and description shown to drivers.">
                  <div className="grid gap-3">
                    <label className="block">
                      <FieldLabel>Name</FieldLabel>
                      <input
                        className={inputClass}
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        required
                        readOnly={form.isFree && form.slug === "free"}
                      />
                    </label>

                    {!form.isFree ? (
                      <>
                        <label className="block">
                          <FieldLabel hint="Used internally; auto-generated from name if empty.">
                            Slug
                          </FieldLabel>
                          <input
                            className={inputClass}
                            value={form.slug}
                            onChange={(e) => setField("slug", e.target.value)}
                            placeholder="auto from name"
                          />
                        </label>
                        <label className="block">
                          <FieldLabel>Price (INR)</FieldLabel>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className={inputClass}
                            value={form.amount}
                            onChange={(e) => setField("amount", e.target.value)}
                            required
                          />
                        </label>
                      </>
                    ) : null}

                    <label className="block">
                      <FieldLabel>Description</FieldLabel>
                      <textarea
                        className={inputClass}
                        rows={3}
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        placeholder="Short summary for drivers…"
                      />
                    </label>
                  </div>
                </FormSection>

                <FormSection
                  title="Billing period"
                  hint="How long the plan stays active after activation or payment."
                >
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <FieldLabel>Duration</FieldLabel>
                      <input
                        type="number"
                        min="1"
                        className={inputClass}
                        value={form.periodValue}
                        onChange={(e) => setField("periodValue", e.target.value)}
                        required
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Unit</FieldLabel>
                      <select
                        className={inputClass}
                        value={form.periodUnit}
                        onChange={(e) => setField("periodUnit", e.target.value)}
                      >
                        {(meta.periodUnits || ["days", "months"]).map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </FormSection>

                <FormSection
                  title="Enroute pickup allowance"
                  hint="Controls how many enroute passengers/couriers a driver can pick."
                >
                  <PickLimitFields
                    form={form}
                    setField={setField}
                    inputClassName={inputClass}
                    fieldId={form.isFree ? "free" : "paid"}
                  />
                </FormSection>

                {form.isFree ? (
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    New drivers receive this free plan once. After it expires or enroute pickups are
                    used up, they must upgrade to a paid plan.
                  </div>
                ) : null}

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Plan is active
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Inactive plans are hidden from driver subscription screens.
                    </span>
                  </span>
                </label>
              </div>

              <div className="lg:col-span-2">
                <PlanPreviewPanel form={form} />
              </div>
            </div>

            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" className={btnClass("secondary")} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className={btnClass("primary")} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create plan"}
              </button>
            </div>
          </form>
        </ModalBackdrop>
      ) : null}

      {deleteTarget ? (
        <ModalBackdrop onClose={() => !saving && setDeleteTarget(null)} size="md">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-xl dark:bg-rose-950/50">
                🗑️
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete paid plan?</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Remove <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.name}</strong>{" "}
                  from driver subscription options. This cannot be undone.
                </p>
              </div>
            </div>
            {error ? <Alert variant="error">{error}</Alert> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btnClass("secondary")}
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={btnClass("danger")}
                onClick={confirmDelete}
                disabled={saving}
              >
                {saving ? "Deleting…" : "Delete plan"}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      ) : null}
    </AdminPageShell>
  );
}
