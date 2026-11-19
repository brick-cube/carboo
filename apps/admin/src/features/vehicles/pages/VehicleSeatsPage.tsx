import { useMemo, useState } from "react";
import { ArrowLeft, Save, Armchair, AlertTriangle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import VehicleSeatLayout from "../components/VehicleSeatLayout";
import { useUpdateVehicleSeats, useVehicleSeats } from "../hooks/useVehicles";
import type { VehicleSeat } from "../types/vehicle.types";
import { getVehicleErrorMessage } from "../utils/vehicle.utils";

export default function VehicleSeatsPage() {
  const { id = "" } = useParams();
  const query = useVehicleSeats(id);
  const mutation = useUpdateVehicleSeats();
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState<VehicleSeat[] | null>(null);
  const [error, setError] = useState("");
  const vehicle = query.data;
  const seats = drafts ?? vehicle?.seats ?? [];
  const selected = seats.find((seat) => (seat.id ?? seat.seatNumber) === selectedId);

  const changed = useMemo(() => Boolean(drafts), [drafts]);

  function updateSelected<K extends keyof VehicleSeat>(key: K, value: VehicleSeat[K]) {
    if (!selected) return;
    setDrafts((current) => (current ?? vehicle?.seats ?? []).map((seat) =>
      (seat.id ?? seat.seatNumber) === selectedId ? { ...seat, [key]: value } : seat
    ));
  }

  async function save() {
    if (!vehicle || !drafts) return;
    setError("");
    try {
      await mutation.mutateAsync({ id, seats: drafts });
      setDrafts(null);
    } catch (err) {
      setError(getVehicleErrorMessage(err, "Could not update the seat layout."));
    }
  }

  if (query.isLoading) return <State>Loading vehicle seats...</State>;
  if (query.isError || !vehicle) return <State>Could not load vehicle seats.</State>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Link to={`/vehicles/${id}`} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-white"><ArrowLeft size={18} /></Link><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Vehicle seat inventory</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{vehicle.name}</h1><p className="text-xs text-slate-500">{vehicle.registrationNumber} · {vehicle.totalSeats} bookable seats</p></div></div>
        <button disabled={!changed || mutation.isPending} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#ff5a1f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"><Save size={16} />{mutation.isPending ? "Saving..." : "Save seat changes"}</button>
      </div>

      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p>Saving replaces the complete vehicle seat layout. The backend prevents layout replacement once trips have been created for this vehicle. Existing trip inventory is never silently modified.</p></div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <VehicleSeatLayout seats={seats} selectedSeatId={selectedId} onSelect={(seat) => setSelectedId(seat.id ?? seat.seatNumber)} editable />
        <aside className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><Armchair size={18} className="text-orange-600" /><h2 className="font-semibold text-slate-900">Seat properties</h2></div>
          {!selected ? <p className="mt-5 text-sm text-slate-500">Select a seat in the layout to edit its details.</p> : (
            <div className="mt-5 space-y-4">
              <Field label="Seat number"><input value={selected.seatNumber} onChange={(e) => updateSelected("seatNumber", e.target.value)} className={inputClass} /></Field>
              <Field label="Label"><input value={selected.label ?? ""} onChange={(e) => updateSelected("label", e.target.value || null)} className={inputClass} /></Field>
              <Field label="Seat type"><select value={selected.seatType} onChange={(e) => updateSelected("seatType", e.target.value as VehicleSeat["seatType"])} className={inputClass}>{["REGULAR","PREMIUM","SLEEPER","RECLINER","DRIVER","STAFF"].map((type) => <option key={type}>{type}</option>)}</select></Field>
              <Field label="Price multiplier"><input type="number" min="0.01" step="0.01" value={selected.priceMultiplier} onChange={(e) => updateSelected("priceMultiplier", Number(e.target.value))} className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="X position"><input type="number" value={selected.x} onChange={(e) => updateSelected("x", Number(e.target.value))} className={inputClass} /></Field>
                <Field label="Y position"><input type="number" value={selected.y} onChange={(e) => updateSelected("y", Number(e.target.value))} className={inputClass} /></Field>
                <Field label="Width"><input type="number" min="1" value={selected.width} onChange={(e) => updateSelected("width", Number(e.target.value))} className={inputClass} /></Field>
                <Field label="Height"><input type="number" min="1" value={selected.height} onChange={(e) => updateSelected("height", Number(e.target.value))} className={inputClass} /></Field>
              </div>
              <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">Bookable<input type="checkbox" checked={selected.isBookable} onChange={(e) => updateSelected("isBookable", e.target.checked)} className="h-4 w-4 accent-orange-500" /></label>
              <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">Active<input type="checkbox" checked={selected.isActive} onChange={(e) => updateSelected("isActive", e.target.checked)} className="h-4 w-4 accent-orange-500" /></label>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600">{label}{children}</label>; }
function State({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{children}</div>; }
