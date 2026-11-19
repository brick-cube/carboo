import { useEffect, useState } from "react";
import { ArrowLeft, BusFront, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Vehicle, VehiclePayload, VehicleStatus } from "../types/vehicle.types";
import { useCreateVehicle, useUpdateVehicle, useUpdateVehicleStatus } from "../hooks/useVehicles";
import { useSeatConfigurations } from "../../seat-configurations/hooks/useSeatConfigurations";
import { getVehicleErrorMessage } from "../utils/vehicle.utils";

export default function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const navigate = useNavigate();
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const updateStatusMutation = useUpdateVehicleStatus();
  const isEdit = Boolean(vehicle);
  const { data: configurationsData, isLoading: configurationsLoading } = useSeatConfigurations({ page: 1, limit: 100, isActive: true });

  const [form, setForm] = useState({
    name: vehicle?.name ?? "",
    registrationNumber: vehicle?.registrationNumber ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    vehicleType: vehicle?.vehicleType ?? "BUS",
    description: vehicle?.description ?? "",
    status: vehicle?.status ?? "ACTIVE" as VehicleStatus,
    seatConfigurationId: vehicle?.seatConfigurationId ?? "",
    amenitiesText: Array.isArray(vehicle?.amenities) ? vehicle.amenities.join(", ") : "",
    imageUrl: Array.isArray(vehicle?.images) ? String(vehicle.images[0] ?? "") : "",
  });
  const mutation = isEdit ? updateMutation : createMutation;
  const busy = mutation.isPending || updateStatusMutation.isPending;

  useEffect(() => {
    if (!vehicle) return;
    setForm((current) => ({
      ...current,
      name: vehicle.name,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      vehicleType: vehicle.vehicleType ?? "BUS",
      description: vehicle.description ?? "",
      status: vehicle.status,
      seatConfigurationId: vehicle.seatConfigurationId ?? "",
      amenitiesText: Array.isArray(vehicle.amenities) ? vehicle.amenities.join(", ") : "",
      imageUrl: Array.isArray(vehicle.images) ? String(vehicle.images[0] ?? "") : "",
    }));
  }, [vehicle]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: VehiclePayload = {
      name: form.name.trim(),
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      vehicleType: form.vehicleType || null,
      description: form.description.trim() || null,
      status: form.status,
      amenities: form.amenitiesText.split(",").map((item) => item.trim()).filter(Boolean),
      images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
      ...(!isEdit ? { seatConfigurationId: form.seatConfigurationId || null } : {}),
    };

    try {
      if (vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, payload });
        if (form.status !== vehicle.status) {
          await updateStatusMutation.mutateAsync({ id: vehicle.id, status: form.status });
        }
        navigate(`/vehicles/${vehicle.id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/vehicles/${created.id}`);
      }
    } catch {
      // Error is shown from mutation state below.
    }
  }

  const error = mutation.error ? getVehicleErrorMessage(mutation.error) : null;
  const configurations = configurationsData?.items ?? [];

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={vehicle ? `/vehicles/${vehicle.id}` : "/vehicles"} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"><ArrowLeft size={18} /></Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">{isEdit ? "Fleet management" : "New fleet vehicle"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{isEdit ? "Edit vehicle" : "Add a vehicle"}</h1>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><BusFront size={19} /></div>
          <div><h2 className="font-semibold text-slate-900">Vehicle information</h2><p className="text-xs text-slate-500">Basic identity and operational details.</p></div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Vehicle name" required><input required maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kannur Express 01" className={inputClass} /></Field>
          <Field label="Registration number" required><input required maxLength={30} value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} placeholder="e.g. KL-13-AB-1234" className={inputClass} /></Field>
          <Field label="Make"><input value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="e.g. Ashok Leyland" className={inputClass} /></Field>
          <Field label="Model"><input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. Viking" className={inputClass} /></Field>
          <Field label="Vehicle type"><select value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)} className={inputClass}><option value="BUS">Bus</option><option value="MINIBUS">Minibus</option><option value="VAN">Van</option><option value="SLEEPER">Sleeper</option><option value="OTHER">Other</option></select></Field>
          <Field label="Status"><select value={form.status} onChange={(e) => set("status", e.target.value as VehicleStatus)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="MAINTENANCE">Maintenance</option></select></Field>
          <div className="md:col-span-2"><Field label="Description"><textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional vehicle notes..." className={inputClass} /></Field></div>
        </div>
      </section>

      {!isEdit && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="mb-5"><h2 className="font-semibold text-slate-900">Seat configuration</h2><p className="mt-1 text-sm text-slate-500">Choose a reusable layout. The API copies its seats into this vehicle as an independent snapshot.</p></div>
          <Field label="Reusable configuration">
            <select value={form.seatConfigurationId} onChange={(e) => set("seatConfigurationId", e.target.value)} className={inputClass} disabled={configurationsLoading}>
              <option value="">Create vehicle without a seat layout</option>
              {configurations.map((configuration) => <option key={configuration.id} value={configuration.id}>{configuration.name} · {configuration.seats?.length ?? configuration._count?.seats ?? 0} seats</option>)}
            </select>
          </Field>
          {form.seatConfigurationId && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">This configuration will be copied to the vehicle. Later template changes will not automatically alter this vehicle.</p>}
          {configurations.length === 0 && !configurationsLoading && <p className="mt-3 text-sm text-amber-700">No active seat configurations found. You can create the vehicle now and assign a layout later.</p>}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="font-semibold text-slate-900">Amenities and images</h2>
        <p className="mt-1 text-sm text-slate-500">Optional details for display and future passenger-facing pages.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Amenities"><textarea rows={3} value={form.amenitiesText} onChange={(e) => set("amenitiesText", e.target.value)} placeholder="Wi-Fi, AC, USB charging, Reading light" className={inputClass} /><span className="mt-1 block text-xs text-slate-400">Separate amenities with commas.</span></Field>
          <Field label="Primary image URL"><input type="url" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." className={inputClass} /><span className="mt-1 block text-xs text-slate-400">You can add image upload integration later.</span></Field>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Link to={vehicle ? `/vehicles/${vehicle.id}` : "/vehicles"} className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5a1f] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-[#eb4b13] disabled:cursor-not-allowed disabled:opacity-60"><Save size={16} />{busy ? "Saving..." : isEdit ? "Save changes" : "Create vehicle"}</button>
      </div>
    </form>
  );
}

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:bg-slate-50";
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{required && <span className="ml-1 text-orange-600">*</span>}{children}</label>;
}
