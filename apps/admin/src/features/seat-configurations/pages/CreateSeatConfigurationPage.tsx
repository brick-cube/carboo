import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SeatConfigurationForm from "../components/SeatConfigurationForm";
import { useCreateSeatConfiguration } from "../hooks/useSeatConfigurations";
import type { SeatConfigurationPayload } from "../types/seat-configuration.types";

export default function CreateSeatConfigurationPage() {
  const navigate = useNavigate();
  const mutation = useCreateSeatConfiguration();
  const [error, setError] = useState("");

  const handleCreate = (payload: SeatConfigurationPayload) => {
    setError("");
    mutation.mutate(payload, {
      onSuccess: (configuration) => navigate(`/seat-configurations/${configuration.id}/edit`, { replace: true }),
      onError: (requestError) => setError((requestError as Error).message || "Unable to create this configuration."),
    });
  };

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f4511e]">Fleet setup / Seat configurations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create seat configuration</h1><p className="mt-1.5 text-sm text-slate-500">Design a reusable seating layout. Each vehicle receives its own independent copy when this template is applied.</p></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <SeatConfigurationForm isPending={mutation.isPending} submitLabel="Create configuration" onSubmit={handleCreate} />
    </div>
  );
}
