import { useEffect, useState } from "react";
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
  if (plan?.unlimitedPicks) return "Unlimited picks";
  if (plan?.enroutePickLimit) return `${plan.enroutePickLimit} en route picks`;
  if (plan?.rideLimit) return `${plan.rideLimit} ride(s) (legacy)`;
  return "—";
};

const PickLimitFields = ({ form, setField, inputClassName }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
    <span className="mb-2 block text-sm font-medium text-slate-800">En route pick limit</span>

    <label className="mb-3 flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={!!form.unlimitedPicks}
        onChange={(e) => setField("unlimitedPicks", e.target.checked)}
      />
      Unlimited picks during plan period
    </label>

    {!form.unlimitedPicks ? (
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Number of picks</span>
        <input
          type="number"
          min="1"
          className={inputClassName}
          value={form.enroutePickLimit}
          onChange={(e) => setField("enroutePickLimit", e.target.value)}
          required
        />
        <span className="mt-1 block text-xs text-slate-500">
          Total en route passengers and couriers a driver can pick during this plan period.
        </span>
      </label>
    ) : (
      <p className="text-xs text-slate-500">
        Driver can pick unlimited en route passengers and couriers until the plan expires.
      </p>
    )}
  </div>
);

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [meta, setMeta] = useState({ periodUnits: ["days", "months"] });
  const [form, setForm] = useState(emptyPaidForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const openCreate = (free = false) => {
    if (free && existingFreePlan) {
      openEdit(existingFreePlan);
      setError(
        "A free plan already exists — edit it below to change pick count or duration."
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
      enroutePickLimit: plan.enroutePickLimit ?? plan.rideLimit ?? 5,
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subscription plan?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteSubscriptionPlan(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const periodFields = (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Plan duration</span>
        <input
          type="number"
          min="1"
          className={inputClass}
          value={form.periodValue}
          onChange={(e) => setField("periodValue", e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Duration unit</span>
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
  );

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Driver subscription plans"
        subtitle="New drivers get the free plan once. Set duration and pick limits (or unlimited) for each plan."
      >
        <button type="button" className={btnClass("primary", "sm")} onClick={() => openCreate(false)}>
          Add paid plan
        </button>
        <button
          type="button"
          className={btnClass("secondary", "sm")}
          onClick={() =>
            existingFreePlan ? openEdit(existingFreePlan) : openCreate(true)
          }
        >
          {existingFreePlan ? "Edit free plan" : "Add free plan"}
        </button>
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
          Refresh
        </button>
      </PageHeader>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <AdminTablePanel>
        {loading ? (
          <Loading />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th>Price</Th>
                <Th>Duration</Th>
                <Th>Pick limit</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <Td colSpan={6}>No plans yet. Create a free plan and paid plans for drivers.</Td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan._id}>
                    <Td>
                      <div className="font-semibold text-slate-900">{plan.name}</div>
                      <div className="text-xs text-slate-500">{plan.slug}</div>
                      {plan.isFree ? (
                        <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                          Default · one-time for new drivers
                        </span>
                      ) : null}
                      {plan.description ? (
                        <div className="mt-1 max-w-md text-xs text-slate-500">{plan.description}</div>
                      ) : null}
                    </Td>
                    <Td>
                      {plan.isFree || plan.amount === 0
                        ? "Free"
                        : `₹${plan.amount} ${plan.currency || "INR"}`}
                    </Td>
                    <Td>{formatPeriod(plan)}</Td>
                    <Td>{formatPickLimit(plan)}</Td>
                    <Td>
                      <span
                        className={
                          plan.isActive
                            ? "font-semibold text-emerald-700"
                            : "text-slate-400"
                        }
                      >
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <TableActions>
                        <IconActionButton
                          label="Edit"
                          icon={IconEdit}
                          onClick={() => openEdit(plan)}
                        />
                        <IconActionButton
                          label={plan.isActive ? "Deactivate" : "Activate"}
                          icon={plan.isActive ? IconPause : IconPlay}
                          onClick={() => handleToggleActive(plan)}
                        />
                        {!plan.isFree ? (
                          <IconActionButton
                            label="Delete"
                            icon={IconTrash}
                            tone="danger"
                            onClick={() => handleDelete(plan._id)}
                          />
                        ) : null}
                      </TableActions>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </AdminTablePanel>

      {modalOpen ? (
        <ModalBackdrop onClose={() => !saving && setModalOpen(false)} size="lg">
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-bold text-slate-900">
              {editingId
                ? "Edit plan"
                : form.isFree
                  ? "New free plan"
                  : "New paid plan"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {form.isFree
                ? "Assigned once to new drivers. Set duration and pick limits below."
                : "Set price, duration, pick limits, and description. Payments via Razorpay."}
            </p>

            <div className="mt-4 grid gap-3">
              {form.isFree ? (
                <>
                  {periodFields}
                  <PickLimitFields form={form} setField={setField} inputClassName={inputClass} />

                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Description</span>
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Name</span>
                    <input
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      required
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Slug (optional)</span>
                    <input
                      className={inputClass}
                      value={form.slug}
                      onChange={(e) => setField("slug", e.target.value)}
                      placeholder="auto from name"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Description</span>
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Amount (INR)</span>
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

                  {periodFields}
                  <PickLimitFields form={form} setField={setField} inputClassName={inputClass} />
                </>
              )}

              {form.isFree ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  The free plan is assigned automatically to new drivers once. After it expires or picks
                  are used up, drivers must upgrade to a paid plan — free plan cannot be renewed.
                </p>
              ) : null}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                />
                Active
              </label>
            </div>

            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnClass("secondary")}
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className={btnClass("primary")} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create plan"}
              </button>
            </div>
          </form>
        </ModalBackdrop>
      ) : null}
    </AdminPageShell>
  );
}
