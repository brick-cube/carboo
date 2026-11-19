import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import SeatConfigurationForm from "../components/SeatConfigurationForm";
import { useSeatConfiguration, useUpdateSeatConfiguration } from "../hooks/useSeatConfigurations";
import type { SeatConfigurationPayload } from "../types/seat-configuration.types";

export default function EditSeatConfigurationPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useSeatConfiguration(id);
  const mutation = useUpdateSeatConfiguration();
  const [error, setError] = useState("");

  const handleUpdate = (payload: SeatConfigurationPayload) => {
    setError("");
    mutation.mutate({ id, payload }, {
      onSuccess: () => query.refetch(),
      onError: (requestError) => setError((requestError as Error).message || "Unable to update this configuration."),
    });
  };

  if (query.isLoading) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading configuration...</div>;
  if (query.isError || !query.data) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5"><div className="flex items-center gap-2 font-semibold text-red-800"><AlertCircle className="h-4 w-4" /> Could not load this configuration</div><p className="mt-1 text-sm text-red-700">{(query.error as Error)?.message || "The configuration may have been deleted or you may not have access."}</p><Link to="/seat-configurations" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-800 underline"><ArrowLeft className="h-4 w-4" /> Back to configurations</Link></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f4511e]">Fleet setup / Seat configurations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Edit configuration</h1><p className="mt-1.5 text-sm text-slate-500">Update <strong className="font-semibold text-slate-700">{query.data.name}</strong> and save your layout changes.</p></div><button type="button" onClick={() => navigate("/seat-configurations")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> All configurations</button></div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Changes to this reusable template do not automatically modify vehicles that already have their own seat-layout snapshots.</div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <SeatConfigurationForm key={query.data.id} initial={query.data} isPending={mutation.isPending} submitLabel="Save changes" onSubmit={handleUpdate} />
    </div>
  );
}
