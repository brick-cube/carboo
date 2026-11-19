import { BusFront, MoreHorizontal, Pencil, Armchair, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import type { Vehicle } from "../types/vehicle.types";
import VehicleStatusBadge from "./VehicleStatusBadge";
import { formatVehicleType, getVehicleSeatCount } from "../utils/vehicle.utils";

export default function VehicleTable({ vehicles, onStatusClick }: {
  vehicles: Vehicle[];
  onStatusClick: (vehicle: Vehicle) => void;
}) {
  if (!vehicles.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><BusFront /></div>
        <h3 className="mt-4 text-sm font-semibold text-slate-900">No vehicles found</h3>
        <p className="mt-1 text-sm text-slate-500">Try changing your filters or add your first vehicle.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              <th className="px-5 py-4">Vehicle</th>
              <th className="px-5 py-4">Registration</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Seats</th>
              <th className="px-5 py-4">Configuration</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="transition hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><BusFront size={19} /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{vehicle.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Make and model not set"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700">{vehicle.registrationNumber}</span></td>
                <td className="px-5 py-4 text-sm text-slate-600">{formatVehicleType(vehicle.vehicleType)}</td>
                <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Armchair size={15} className="text-slate-400" />{getVehicleSeatCount(vehicle)}</span></td>
                <td className="px-5 py-4 text-sm text-slate-600">{vehicle.seatConfiguration?.name ?? <span className="text-slate-400">Not assigned</span>}</td>
                <td className="px-5 py-4"><VehicleStatusBadge status={vehicle.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link title="View vehicle" to={`/vehicles/${vehicle.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Eye size={16} /></Link>
                    <Link title="Edit vehicle" to={`/vehicles/${vehicle.id}/edit`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil size={16} /></Link>
                    <Link title="Manage seats" to={`/vehicles/${vehicle.id}/seats`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Armchair size={16} /></Link>
                    <button title="Change status" onClick={() => onStatusClick(vehicle)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><MoreHorizontal size={17} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
