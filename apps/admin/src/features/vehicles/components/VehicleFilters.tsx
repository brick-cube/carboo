import { Search, SlidersHorizontal, X } from "lucide-react";
import type { VehicleStatus } from "../types/vehicle.types";

interface Props {
  search: string;
  status: VehicleStatus | "";
  vehicleType: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: VehicleStatus | "") => void;
  onTypeChange: (value: string) => void;
  onReset: () => void;
}

export default function VehicleFilters(props: Props) {
  const hasFilters = Boolean(props.search || props.status || props.vehicleType);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="Search name, registration, make or model..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs text-slate-500">
          <SlidersHorizontal size={15} />
          <select value={props.status} onChange={(event) => props.onStatusChange(event.target.value as VehicleStatus | "")} className="bg-transparent text-sm font-medium text-slate-700 outline-none">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </label>
        <label className="flex h-11 items-center rounded-xl border border-slate-200 px-3">
          <select value={props.vehicleType} onChange={(event) => props.onTypeChange(event.target.value)} className="bg-transparent text-sm font-medium text-slate-700 outline-none">
            <option value="">All vehicle types</option>
            <option value="BUS">Bus</option>
            <option value="MINIBUS">Minibus</option>
            <option value="VAN">Van</option>
            <option value="SLEEPER">Sleeper</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        {hasFilters && (
          <button onClick={props.onReset} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100">
            <X size={15} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
