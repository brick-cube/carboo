import type { VehicleStatus } from "../types/vehicle.types";
import { getVehicleStatusLabel } from "../utils/vehicle.utils";

const styles: Record<VehicleStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
  MAINTENANCE: "bg-amber-50 text-amber-700 ring-amber-200",
};

export default function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {getVehicleStatusLabel(status)}
    </span>
  );
}
