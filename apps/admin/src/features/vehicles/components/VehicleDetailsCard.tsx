import { Armchair, CalendarDays, ClipboardList, Pencil, Settings2, ShieldCheck, BusFront } from "lucide-react";
import { Link } from "react-router-dom";
import type { Vehicle } from "../types/vehicle.types";
import VehicleStatusBadge from "./VehicleStatusBadge";
import { formatVehicleType, getVehicleSeatCount, parseJsonList } from "../utils/vehicle.utils";

export default function VehicleDetailsCard({ vehicle }: { vehicle: Vehicle }) {
  const amenities = parseJsonList(vehicle.amenities);
  const image = parseJsonList(vehicle.images)[0];
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative flex min-h-44 items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
          {image ? <img src={image} alt={vehicle.name} className="absolute inset-0 h-full w-full object-cover opacity-70" /> : <BusFront size={68} className="text-white/30" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Fleet vehicle</p><h2 className="mt-1 text-2xl font-bold text-white">{vehicle.name}</h2><p className="mt-1 font-mono text-sm text-white/75">{vehicle.registrationNumber}</p></div>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Armchair size={17} />} label="Bookable seats" value={String(getVehicleSeatCount(vehicle))} />
          <Metric icon={<BusFront size={17} />} label="Vehicle type" value={formatVehicleType(vehicle.vehicleType)} />
          <Metric icon={<Settings2 size={17} />} label="Seat configuration" value={vehicle.seatConfiguration?.name ?? "Not assigned"} />
          <Metric icon={<ClipboardList size={17} />} label="Created trips" value={String(vehicle._count?.trips ?? 0)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Vehicle information</h3><Link to={`/vehicles/${vehicle.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"><Pencil size={14} /> Edit</Link></div>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Info label="Make" value={vehicle.make} /><Info label="Model" value={vehicle.model} /><Info label="Registration" value={vehicle.registrationNumber} /><Info label="Vehicle type" value={formatVehicleType(vehicle.vehicleType)} /><Info label="Created" value={vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : "—"} /><Info label="Last updated" value={vehicle.updatedAt ? new Date(vehicle.updatedAt).toLocaleDateString() : "—"} />
          <div className="sm:col-span-2"><Info label="Description" value={vehicle.description} /></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="font-semibold text-slate-900">Amenities</h3>
        {amenities.length ? <div className="mt-4 flex flex-wrap gap-2">{amenities.map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">{item}</span>)}</div> : <p className="mt-2 text-sm text-slate-500">No amenities added.</p>}
      </section>
      <div className="flex flex-wrap gap-3">
        <Link to={`/vehicles/${vehicle.id}/seats`} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"><Armchair size={16} /> Manage seat layout</Link>
        <Link to={`/vehicles/${vehicle.id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={16} /> Edit vehicle</Link>
      </div>
    </div>
  );
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-3"><div className="rounded-lg bg-slate-100 p-2 text-slate-500">{icon}</div><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p></div></div>;
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value || "—"}</p></div>;
}
