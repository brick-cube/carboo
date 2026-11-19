import { useMemo, useState } from "react";
import { Archive, Armchair, LayoutGrid, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useArchiveSeatConfiguration, useSeatConfigurations } from "../hooks/useSeatConfigurations";
import type { SeatConfiguration } from "../types/seat-configuration.types";

function MiniLayout({ configuration }: { configuration: SeatConfiguration }) {
  const width = configuration.canvasWidth || 360;
  const height = configuration.canvasHeight || 760;
  const scale = Math.min(120 / width, 142 / height);
  return (
    <div className="relative overflow-hidden rounded-[20px] border-[3px] border-slate-300 bg-white shadow-inner" style={{ width: width * scale, height: height * scale }}>
      {(configuration.elements ?? []).map((element, index) => <div key={element.id ?? index} className={`absolute rounded-sm ${element.type === "AISLE" ? "border border-dashed border-slate-200 bg-slate-100" : "border border-slate-300 bg-slate-200"}`} style={{ left: element.x * scale, top: element.y * scale, width: element.width * scale, height: element.height * scale, transform: `rotate(${element.rotation}deg)` }} />)}
      {(configuration.seats ?? []).map((seat, index) => <div key={seat.id ?? `${seat.seatNumber}-${index}`} className={`absolute rounded-[3px] border ${seat.seatType === "PREMIUM" ? "border-amber-400 bg-amber-200" : seat.seatType === "SLEEPER" ? "border-violet-400 bg-violet-200" : seat.seatType === "RECLINER" ? "border-sky-400 bg-sky-200" : "border-slate-400 bg-slate-200"} ${seat.isActive ? "" : "opacity-30"}`} style={{ left: seat.x * scale, top: seat.y * scale, width: seat.width * scale, height: seat.height * scale, transform: `rotate(${seat.rotation}deg)` }} />)}
    </div>
  );
}

function ConfigurationCard({ configuration, onArchive, archiving }: { configuration: SeatConfiguration; onArchive: () => void; archiving: boolean }) {
  const seatCount = configuration._count?.seats ?? configuration.seats?.length ?? 0;
  const activeSeats = configuration.seats?.filter((seat) => seat.isActive && seat.isBookable).length;
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="relative flex h-52 items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <MiniLayout configuration={configuration} />
        <span className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-semibold ${configuration.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{configuration.isActive ? "Active" : "Archived"}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="truncate font-semibold text-slate-950">{configuration.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{configuration.description || "No description added."}</p></div>
          <button type="button" onClick={onArchive} disabled={archiving || !configuration.isActive} title="Archive configuration" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Archive className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Armchair className="h-3.5 w-3.5" /><strong className="text-slate-800">{seatCount}</strong> seats</span>{activeSeats !== undefined && <span>{activeSeats} bookable</span>}</div>
          <Link to={`/seat-configurations/${configuration.id}/edit`} className="text-sm font-semibold text-[#f4511e] hover:underline">Edit layout</Link>
        </div>
      </div>
    </article>
  );
}

export default function SeatConfigurationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ page, limit: 9, search: search.trim() || undefined, isActive: status === "all" ? undefined : status === "active" }), [page, search, status]);
  const query = useSeatConfigurations(params);
  const archive = useArchiveSeatConfiguration();
  const configurations = query.data?.items ?? [];

  const handleArchive = (configuration: SeatConfiguration) => {
    if (!window.confirm(`Archive "${configuration.name}"? Existing vehicles will keep their own seat layouts.`)) return;
    archive.mutate(configuration.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f4511e]"><LayoutGrid className="h-3.5 w-3.5" /> Fleet setup</div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Seat configurations</h1><p className="mt-1.5 max-w-2xl text-sm text-slate-500">Create reusable seating layouts and apply them to vehicles across your fleet.</p></div>
        <button type="button" onClick={() => navigate("/seat-configurations/new")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff5a1f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e94b13]"><Plus className="h-4 w-4" /> New configuration</button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by configuration name..." className="w-full rounded-xl border border-transparent bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-50" /></div>
        <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-slate-400" /><select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-300"><option value="all">All configurations</option><option value="active">Active only</option><option value="inactive">Archived</option></select></div>
      </div>

      {query.isLoading ? <div className="flex min-h-56 items-center justify-center text-sm text-slate-500">Loading seat configurations...</div> : query.isError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{(query.error as Error).message || "Unable to load seat configurations."}<button type="button" onClick={() => query.refetch()} className="ml-2 font-semibold underline">Try again</button></div> : configurations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5a1f]"><Armchair className="h-6 w-6" /></div><h2 className="mt-4 font-semibold text-slate-900">{search || status !== "all" ? "No matching configurations" : "No seat configurations yet"}</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{search || status !== "all" ? "Try changing your search or status filter." : "Create your first reusable layout to start configuring your vehicles."}</p>{!search && status === "all" && <button type="button" onClick={() => navigate("/seat-configurations/new")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ff5a1f] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Create configuration</button>}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{configurations.map((configuration) => <ConfigurationCard key={configuration.id} configuration={configuration} archiving={archive.isPending && archive.variables === configuration.id} onArchive={() => handleArchive(configuration)} />)}</div>
          {(query.data?.pagination.totalPages ?? 1) > 1 && <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="text-xs text-slate-500">Page {query.data?.pagination.page ?? page} of {query.data?.pagination.totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= (query.data?.pagination.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Next</button></div></div>}
        </>
      )}
    </div>
  );
}
