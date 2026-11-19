import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useVehicle } from "../hooks/useVehicles";
import VehicleDetailsCard from "../components/VehicleDetailsCard";

export default function VehicleDetailsPage() {
  const { id = "" } = useParams();
  const query = useVehicle(id);
  if (query.isLoading) return <State>Loading vehicle details...</State>;
  if (query.isError || !query.data) return <State>Vehicle not found or could not be loaded.</State>;
  return (
    <div className="space-y-6">
      <Link to="/vehicles" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16} /> Back to vehicles</Link>
      <VehicleDetailsCard vehicle={query.data} />
    </div>
  );
}
function State({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{children}</div>; }
