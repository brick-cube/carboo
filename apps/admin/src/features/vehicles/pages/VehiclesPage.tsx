import { useMemo, useState } from "react";
import { BusFront, Plus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import VehicleFilters from "../components/VehicleFilters";
import VehicleTable from "../components/VehicleTable";
import { useUpdateVehicleStatus, useVehicles } from "../hooks/useVehicles";
import type { VehicleStatus } from "../types/vehicle.types";
import { getVehicleErrorMessage } from "../utils/vehicle.utils";

export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "">("");
  const [vehicleType, setVehicleType] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({
    page, limit: 10, ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}), ...(vehicleType ? { vehicleType } : {}),
  }), [page, search, status, vehicleType]);
  const query = useVehicles(params);
  const statusMutation = useUpdateVehicleStatus();
  const vehicles = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const [statusError, setStatusError] = useState("");

  async function changeStatus(vehicle: (typeof vehicles)[number]) {
    const next: VehicleStatus = vehicle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(`Change ${vehicle.name} to ${next.toLowerCase()}?`)) return;
    setStatusError("");
    try { await statusMutation.mutateAsync({ id: vehicle.id, status: next }); }
    catch (error) { setStatusError(getVehicleErrorMessage(error)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-orange-600">Fleet management</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Vehicles</h1><p className="mt-1 text-sm text-slate-500">Manage your fleet, seat configurations and vehicle availability.</p></div>
        <Link to="/vehicles/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5a1f] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-[#eb4b13]"><Plus size={17} /> Add vehicle</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Vehicles shown" value={String(pagination?.total ?? vehicles.length)} icon={<BusFront size={17} />} />
        <Stat label="Active" value={String(vehicles.filter((vehicle) => vehicle.status === "ACTIVE").length)} />
        <Stat label="In maintenance" value={String(vehicles.filter((vehicle) => vehicle.status === "MAINTENANCE").length)} />
      </div>

      <VehicleFilters search={search} status={status} vehicleType={vehicleType} onSearchChange={(value) => { setSearch(value); setPage(1); }} onStatusChange={(value) => { setStatus(value); setPage(1); }} onTypeChange={(value) => { setVehicleType(value); setPage(1); }} onReset={() => { setSearch(""); setStatus(""); setVehicleType(""); setPage(1); }} />

      {statusError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{statusError}</div>}
      {query.isLoading ? <Loading /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : <VehicleTable vehicles={vehicles} onStatusClick={changeStatus} />}

      {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between"><p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} vehicles</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40">Next</button></div></div>}
    </div>
  );
}
function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-slate-400"><span className="text-xs font-medium">{label}</span>{icon}</div><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>;
}
function Loading() { return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading vehicles...</div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><p className="text-sm font-semibold text-red-800">Could not load vehicles</p><button onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700"><RefreshCw size={14} /> Try again</button></div>; }
