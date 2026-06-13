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
  isActive: true,
};

const emptyFreeForm = {
  name: "Free Plan",
  slug: "free",
  description: "",
  isFree: true,
  rideLimit: 3,
  isActive: true,
};

const formatPeriod = (plan) => {
  if (!plan?.periodValue) return "—";
  const unit = plan.periodUnit === "months" ? "month(s)" : "day(s)";
  return `${plan.periodValue} ${unit}`;
};

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
        "A free plan already exists — edit it below to change ride count or description."
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
    if (plan.isFree) {
      setForm({
        name: plan.name || "Free Plan",
        slug: plan.slug || "free",
        description: plan.description || "",
        isFree: true,
        rideLimit: plan.rideLimit ?? 3,
        isActive: plan.isActive !== false,
      });
    } else {
      setForm({
        name: plan.name || "",
        slug: plan.slug || "",
        description: plan.description || "",
        isFree: false,
        amount: plan.amount ?? 0,
        currency: plan.currency || "INR",
        periodValue: plan.periodValue ?? 30,
        periodUnit: plan.periodUnit || "days",
        enroutePickLimit: plan.enroutePickLimit ?? 10,
        isActive: plan.isActive !== false,
      });
    }
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = form.isFree
        ? {
            name: form.name || "Free Plan",
            slug: form.slug || "free",
            description: form.description || "",
            isFree: true,
            rideLimit: Number(form.rideLimit) || 1,
            isActive: !!form.isActive,
          }
        : {
            ...form,
            isFree: false,
            amount: Number(form.amount) || 0,
            periodValue: Number(form.periodValue) || 1,
            enroutePickLimit: Number(form.enroutePickLimit) || 1,
          };

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

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Driver subscription plans"
        subtitle="New drivers always start on the free plan. Paid plans are optional upgrades with amount, period, and pick limits."
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
                <Th>Period / rides</Th>
                <Th>Limits</Th>
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
                          Default for new drivers
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
                    <Td>
                      {plan.isFree ? `${plan.rideLimit ?? "—"} ride(s)` : formatPeriod(plan)}
                    </Td>
                    <Td>
                      {plan.isFree
                        ? "Unlimited picks per ride"
                        : `${plan.enroutePickLimit ?? "—"} en route picks`}
                    </Td>
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
                ? "This plan is always assigned to new drivers. Set ride count and description."
                : "Set price, billing period, en route pick limit, and description."}
            </p>

            <div className="mt-4 grid gap-3">
              {form.isFree ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Number of rides</span>
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      value={form.rideLimit}
                      onChange={(e) => setField("rideLimit", e.target.value)}
                      required
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      Unlimited en route passengers & couriers on each of these rides.
                    </span>
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

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium">Period value</span>
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
                      <span className="mb-1 block font-medium">Period unit</span>
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

                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">En route pick limit</span>
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      value={form.enroutePickLimit}
                      onChange={(e) => setField("enroutePickLimit", e.target.value)}
                      required
                    />
                  </label>
                </>
              )}

              {form.isFree ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  The free plan is always the default for new drivers. Paid plans cannot be set as default.
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
