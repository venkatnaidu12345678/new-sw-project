import { useEffect, useMemo, useState } from "react";
import {
  getVehicleFares,
  createVehicleFare,
  updateVehicleFare,
  deleteVehicleFare,
  getLookupTypes,
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
} from "../components/ui/primitives";

const emptyTier = () => ({
  minKm: 0,
  maxKm: "",
  pricePerSeat: 10,
  pricingType: "per_km",
});

const emptyForm = {
  vehicleType: "",
  vehicleLabel: "",
  isActive: true,
  tiers: [emptyTier()],
};

const VEHICLE_ICONS = {
  bike: "🏍️",
  auto: "🛺",
  car: "🚗",
};

const vehicleIcon = (type) => VEHICLE_ICONS[String(type || "").toLowerCase()] || "🚘";

const formatTierRange = (tier) => {
  const min = Number(tier.minKm) || 0;
  const max = tier.maxKm == null || tier.maxKm === "" ? null : Number(tier.maxKm);
  if (max == null) return min > 0 ? `>${min} km` : `${min}+ km`;
  return `${min}–${max} km`;
};

const formatTierPrice = (tier) => {
  const rate = Number(tier.pricePerSeat) || 0;
  return `₹${rate}/km`;
};

const computePreviewFare = (tiers, distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return null;

  const sorted = [...tiers].sort((a, b) => Number(a.minKm) - Number(b.minKm));
  const allPerKm = sorted.length > 0 && sorted.every((t) => t.pricingType === "per_km");

  if (allPerKm) {
    let total = 0;
    for (const tier of sorted) {
      const start = Number(tier.minKm) || 0;
      if (km <= start) break;
      const cap = tier.maxKm == null || tier.maxKm === "" ? km : Number(tier.maxKm);
      const end = Math.min(km, cap);
      const segKm = Math.max(0, end - start);
      if (segKm > 0) total += (Number(tier.pricePerSeat) || 0) * segKm;
    }
    return total > 0 ? Math.max(1, Math.round(total)) : null;
  }

  const match = sorted.find((tier) => {
    const min = Number(tier.minKm) || 0;
    const max = tier.maxKm == null || tier.maxKm === "" ? null : Number(tier.maxKm);
    if (km < min) return false;
    if (max == null) return true;
    return km <= max;
  });
  if (!match) return null;
  return Math.max(1, Math.round((Number(match.pricePerSeat) || 0) * km));
};

function StatCard({ label, value, hint, accent = "brand" }) {
  const accents = {
    brand: "from-brand-500/10 to-accent-violet/5 border-brand-200/60",
    emerald: "from-emerald-500/10 to-teal-500/5 border-emerald-200/60",
    amber: "from-amber-500/10 to-orange-500/5 border-amber-200/60",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${accents[accent] || accents.brand}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        active
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {active ? "Active" : "Paused"}
    </span>
  );
}

function PricingTypeBadge({ type }) {
  const isPerKm = type === "per_km";
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isPerKm
          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200/80"
          : "bg-sky-100 text-sky-800 ring-1 ring-sky-200/80"
      }`}
    >
      {isPerKm ? "Per km" : "Flat"}
    </span>
  );
}

function TierTimeline({ tiers }) {
  if (!tiers?.length) {
    return <p className="text-sm text-slate-400">No tiers configured</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {tiers.map((tier, idx) => {
        const isOpen = tier.maxKm == null || tier.maxKm === "";
        const isLast = idx === tiers.length - 1;
        return (
          <div key={tier._id || idx} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  tier.pricingType === "per_km"
                    ? "bg-amber-100 text-amber-800 ring-2 ring-amber-200/60"
                    : "bg-sky-100 text-sky-800 ring-2 ring-sky-200/60"
                }`}
              >
                {idx + 1}
              </div>
              {!isLast ? <div className="mt-1 w-0.5 flex-1 min-h-[12px] bg-slate-200" /> : null}
            </div>
            <div
              className={`mb-1 flex flex-1 flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                isOpen
                  ? "border-dashed border-amber-300/80 bg-amber-50/50"
                  : "border-slate-200/80 bg-slate-50/80"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{formatTierRange(tier)}</p>
                {isOpen && Number(tier.minKm) > 0 ? (
                  <p className="text-[11px] text-amber-700">If more band</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <PricingTypeBadge type={tier.pricingType} />
                <span className="text-sm font-bold text-slate-900">{formatTierPrice(tier)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FarePreviewPanel({ tiers }) {
  const samples = [8, 15, 25];
  const previews = samples
    .map((km) => ({ km, price: computePreviewFare(tiers, km) }))
    .filter((p) => p.price != null);

  if (!previews.length) return null;

  const allPerKm = tiers.every((t) => t.pricingType === "per_km");

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-brand-50/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <div>
          <p className="text-sm font-bold text-slate-900">Live preview</p>
          <p className="text-xs text-slate-500">
            {allPerKm ? "Stacked per-km ride fare" : "Distance band ride fare"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {previews.map(({ km, price }) => (
          <div
            key={km}
            className="rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 text-center shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {km} km trip
            </p>
            <p className="mt-0.5 text-lg font-bold text-brand-700">₹{price}</p>
            <p className="text-[10px] text-slate-500">ride fare</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierEditorCard({
  tier,
  index,
  total,
  onChange,
  onRemove,
  onOpenEnded,
}) {
  const isPerKm = tier.pricingType === "per_km";
  const isLastTier = index === total - 1;
  const isOpenEnded = tier.maxKm === "" || tier.maxKm == null || tier.maxKm === undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${
        isPerKm
          ? "border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white"
          : "border-sky-200/80 bg-gradient-to-br from-sky-50/40 to-white"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${isPerKm ? "bg-amber-400" : "bg-sky-400"}`}
      />
      <div className="p-4 pl-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                isPerKm ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
              }`}
            >
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Tier {index + 1}</p>
              <p className="text-xs text-slate-500">
                {isOpenEnded && Number(tier.minKm) > 0
                  ? "If more — no upper limit"
                  : formatTierRange(tier)}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`${btnClass("ghost", "sm")} !px-2`}
            onClick={onRemove}
            disabled={total <= 1}
            title="Remove tier"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex rounded-xl border border-slate-200/80 bg-white p-1 shadow-inner">
          {[
            { value: "per_seat", label: "Flat fare", hint: "One price for the distance band" },
            { value: "per_km", label: "Per km", hint: "Rate × km in each band" },
          ].map((opt) => {
            const selected = (tier.pricingType || "per_seat") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.hint}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  selected
                    ? opt.value === "per_km"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-sky-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => onChange("pricingType", opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              From (km)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className={inputClass}
              value={tier.minKm}
              onChange={(e) => onChange("minKm", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              To (km)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className={`${inputClass} ${isOpenEnded ? "bg-slate-50 text-slate-400" : ""}`}
              value={isOpenEnded ? "" : tier.maxKm}
              onChange={(e) => onChange("maxKm", e.target.value)}
              placeholder="∞"
              disabled={isOpenEnded}
            />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {isPerKm ? "Rate (₹ / km)" : "Fare (₹)"}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="0.01"
                step={isPerKm ? "0.1" : "1"}
                className={`${inputClass} pl-8 font-semibold`}
                value={tier.pricePerSeat}
                onChange={(e) => onChange("pricePerSeat", e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {isLastTier ? (
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-amber-300/70 bg-amber-50/60 px-3 py-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              checked={isOpenEnded}
              onChange={(e) => onOpenEnded(e.target.checked)}
            />
            <span className="text-xs font-medium text-amber-900">
              If more — no max km (open-ended band for longer routes)
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

const VEHICLE_FARE_TYPES = ["bike", "auto", "car"];

const canonicalFareType = (value) => {
  const type = String(value || "").trim().toLowerCase();
  if (VEHICLE_FARE_TYPES.includes(type)) return type;
  if (type === "scooter") return "bike";
  if (["hatchback", "sedan", "suv", "muv", "van"].includes(type)) return "car";
  return type;
};

export default function VehicleFarePricing() {
  const [fares, setFares] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getVehicleFares()
      .then((res) => setFares(res.fares || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getLookupTypes("vehicle_type")
      .then((res) =>
        setVehicleTypes(
          (res.types || []).filter(
            (t) =>
              t.isActive !== false &&
              VEHICLE_FARE_TYPES.includes(String(t.value || "").toLowerCase())
          )
        )
      )
      .catch(() => {});
  }, []);

  const configuredTypes = useMemo(
    () => new Set(fares.map((f) => canonicalFareType(f.vehicleType))),
    [fares]
  );

  const availableVehicleTypes = useMemo(
    () =>
      vehicleTypes.filter(
        (t) => t.isActive !== false && !configuredTypes.has(String(t.value || "").toLowerCase())
      ),
    [vehicleTypes, configuredTypes]
  );

  const stats = useMemo(() => {
    const active = fares.filter((f) => f.isActive !== false).length;
    return {
      total: fares.length,
      active,
      available: availableVehicleTypes.length,
    };
  }, [fares, availableVehicleTypes]);

  const openCreate = () => {
    setEditingId(null);
    const first = availableVehicleTypes[0];
    setForm({
      ...emptyForm,
      vehicleType: first?.value || "",
      vehicleLabel: first?.label || "",
      tiers: [emptyTier()],
    });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (fare) => {
    setEditingId(fare._id);
    setForm({
      vehicleType: fare.vehicleType || "",
      vehicleLabel: fare.vehicleLabel || fare.vehicleType || "",
      isActive: fare.isActive !== false,
      tiers: (fare.tiers || []).map((t) => ({
        minKm: t.minKm ?? 0,
        maxKm: t.maxKm ?? "",
        pricePerSeat: t.pricePerSeat ?? 0,
        pricingType: t.pricingType === "per_km" ? "per_km" : "per_seat",
      })),
    });
    setError("");
    setModalOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setTier = (index, key, value) => {
    setForm((f) => {
      const tiers = [...f.tiers];
      tiers[index] = { ...tiers[index], [key]: value };
      return { ...f, tiers };
    });
  };

  const addTier = () => {
    setForm((f) => {
      const last = f.tiers[f.tiers.length - 1];
      const nextMin =
        last?.maxKm != null && last.maxKm !== ""
          ? Number(last.maxKm)
          : Number(last?.minKm || 0) + 10;
      return {
        ...f,
        tiers: [
          ...f.tiers,
          {
            minKm: Number.isFinite(nextMin) ? nextMin : 0,
            maxKm: "",
            pricePerSeat: last?.pricePerSeat ?? 8,
            pricingType: last?.pricingType || "per_seat",
          },
        ],
      };
    });
  };

  const addIfMoreTier = () => {
    setForm((f) => {
      const last = f.tiers[f.tiers.length - 1];
      const nextMin =
        last?.maxKm != null && last.maxKm !== ""
          ? Number(last.maxKm)
          : Number(last?.minKm || 0) + 10;
      return {
        ...f,
        tiers: [
          ...f.tiers,
          {
            minKm: Number.isFinite(nextMin) ? nextMin : 10,
            maxKm: "",
            pricePerSeat: 5,
            pricingType: "per_km",
          },
        ],
      };
    });
  };

  const setTierOpenEnded = (index, open) => {
    setForm((f) => {
      const tiers = [...f.tiers];
      const tier = tiers[index];
      tiers[index] = {
        ...tier,
        maxKm: open
          ? ""
          : tier.maxKm === "" || tier.maxKm == null
            ? Number(tier.minKm || 0) + 10
            : tier.maxKm,
      };
      return { ...f, tiers };
    });
  };

  const removeTier = (index) => {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.length > 1 ? f.tiers.filter((_, i) => i !== index) : f.tiers,
    }));
  };

  const onVehicleTypeChange = (value) => {
    const match = vehicleTypes.find((t) => t.value === value);
    setForm((f) => ({
      ...f,
      vehicleType: value,
      vehicleLabel: match?.label || value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        vehicleType: form.vehicleType,
        vehicleLabel: form.vehicleLabel,
        isActive: form.isActive,
        tiers: form.tiers.map((t) => ({
          minKm: Number(t.minKm),
          maxKm: t.maxKm === "" || t.maxKm == null ? null : Number(t.maxKm),
          pricePerSeat: Number(t.pricePerSeat),
          pricingType: t.pricingType === "per_km" ? "per_km" : "per_seat",
        })),
      };

      if (editingId) {
        await updateVehicleFare(editingId, payload);
      } else {
        await createVehicleFare(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message || "Could not save fare rules");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (fare) => {
    try {
      await updateVehicleFare(fare._id, { isActive: !fare.isActive });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (fare) => {
    if (!window.confirm(`Delete fare rules for ${fare.vehicleLabel || fare.vehicleType}?`)) return;
    try {
      await deleteVehicleFare(fare._id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminPageShell>
      <PageHeader
        compact
        title="Vehicle fare pricing"
        subtitle="Distance-based ride fare per vehicle — flat or stacked per-km bands with an optional “if more” tier. Seats are set separately."
      >
        <button
          type="button"
          className={btnClass("primary", "sm")}
          onClick={openCreate}
          disabled={!availableVehicleTypes.length}
        >
          + Add fares
        </button>
        <button type="button" className={btnClass("secondary", "sm")} onClick={load}>
          Refresh
        </button>
      </PageHeader>

      {error && !modalOpen ? <Alert variant="error">{error}</Alert> : null}

      <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Configured" value={stats.total} hint="Vehicle types with rules" accent="brand" />
        <StatCard label="Active" value={stats.active} hint="Used in driver price hints" accent="emerald" />
        <StatCard
          label="Available"
          value={stats.available}
          hint="Types without fare rules yet"
          accent="amber"
        />
      </div>

      <AdminTablePanel>
        {loading ? (
          <Loading />
        ) : fares.length === 0 ? (
          <div
            className={`${cardClass()} flex flex-col items-center justify-center px-6 py-16 text-center`}
          >
            <span className="mb-4 text-5xl">💰</span>
            <h3 className="text-lg font-bold text-slate-900">No fare rules yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Set distance bands and rates for each vehicle type. Drivers see suggested prices when
              creating rides.
            </p>
            <button
              type="button"
              className={`${btnClass("primary")} mt-6`}
              onClick={openCreate}
              disabled={!availableVehicleTypes.length}
            >
              Create first fare rule
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-2 scrollbar-thin lg:grid-cols-2 xl:grid-cols-2">
            {fares.map((fare) => (
              <article
                key={fare._id}
                className={`${cardClass()} flex flex-col ${
                  fare.isActive === false ? "opacity-75" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-slate-200/80">
                      {vehicleIcon(fare.vehicleType)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900">
                        {fare.vehicleLabel || fare.vehicleType}
                      </h3>
                      <p className="text-xs font-medium text-slate-500">{fare.vehicleType}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge active={fare.isActive !== false} />
                    <button
                      type="button"
                      className={btnClass("primary", "sm")}
                      onClick={() => openEdit(fare)}
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pricing tiers
                  </p>
                  <TierTimeline tiers={fare.tiers} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                  <button
                    type="button"
                    className={btnClass("primary", "sm")}
                    onClick={() => openEdit(fare)}
                  >
                    <IconEdit className="h-3.5 w-3.5" />
                    Edit rules
                  </button>
                  <TableActions>
                    <IconActionButton
                      label={fare.isActive ? "Pause" : "Activate"}
                      onClick={() => toggleActive(fare)}
                      icon={fare.isActive ? IconPause : IconPlay}
                    />
                    <IconActionButton
                      label="Delete"
                      onClick={() => handleDelete(fare)}
                      icon={IconTrash}
                      variant="danger"
                    />
                  </TableActions>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminTablePanel>

      {modalOpen ? (
        <ModalBackdrop onClose={() => !saving && setModalOpen(false)} size="3xl">
          <form onSubmit={handleSave}>
            <div className="-mx-6 -mt-6 mb-5 rounded-t-2xl bg-gradient-to-r from-brand-600 to-accent-violet px-6 py-5 text-white">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit fare rules" : "New fare rules"}
              </h2>
              <p className="mt-1 text-sm text-white/80">
                {editingId
                  ? `Updating ${form.vehicleLabel || form.vehicleType}`
                  : "Choose a vehicle and define distance bands"}
              </p>
            </div>

            {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}

            <div className="mb-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Flat fare</p>
                <p className="mt-1 text-sm text-sky-900/80">
                  0–10 km → ₹50 · 10–20 km → ₹40 — one fare when distance falls in that band.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Stacked per km
                </p>
                <p className="mt-1 text-sm text-amber-900/80">
                  0–10 @ ₹10/km + <strong>if more</strong> @ ₹5/km → 15 km = ₹125 fare.
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Vehicle type
              </label>
              {editingId ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-2xl">{vehicleIcon(form.vehicleType)}</span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {form.vehicleLabel || form.vehicleType}
                    </p>
                    <p className="text-xs text-slate-500">{form.vehicleType}</p>
                  </div>
                </div>
              ) : (
                <select
                  className={inputClass}
                  value={form.vehicleType}
                  onChange={(e) => onVehicleTypeChange(e.target.value)}
                  required
                >
                  <option value="">Select vehicle type</option>
                  {availableVehicleTypes.map((t) => (
                    <option key={t._id} value={t.value}>
                      {t.label} ({t.value})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">Distance tiers</p>
                <p className="text-xs text-slate-500">Bands stack top to bottom</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnClass("secondary", "sm")} onClick={addIfMoreTier}>
                  + If more tier
                </button>
                <button type="button" className={btnClass("secondary", "sm")} onClick={addTier}>
                  + Add tier
                </button>
              </div>
            </div>

            <div className="mb-5 space-y-3">
              {form.tiers.map((tier, index) => (
                <TierEditorCard
                  key={index}
                  tier={tier}
                  index={index}
                  total={form.tiers.length}
                  onChange={(key, value) => setTier(index, key, value)}
                  onRemove={() => removeTier(index)}
                  onOpenEnded={(open) => setTierOpenEnded(index, open)}
                />
              ))}
            </div>

            <div className="mb-5">
              <FarePreviewPanel tiers={form.tiers} />
            </div>

            <label className="mb-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
              />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Active</p>
                <p className="text-xs text-emerald-700/80">
                  Show suggested ride fare to drivers on create ride
                </p>
              </div>
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className={btnClass("secondary")}
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className={btnClass("primary")} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create rules"}
              </button>
            </div>
          </form>
        </ModalBackdrop>
      ) : null}
    </AdminPageShell>
  );
}
