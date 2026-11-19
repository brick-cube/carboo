import { useParams } from "react-router-dom";
import VehicleForm from "../components/VehicleForm";
import { useVehicle } from "../hooks/useVehicles";

export default function EditVehiclePage() {
  const { id = "" } = useParams();
  const query = useVehicle(id);
  if (query.isLoading) return <PageState>Loading vehicle...</PageState>;
  if (query.isError || !query.data) return <PageState>Vehicle could not be found. Check the API response and try again.</PageState>;
  return <VehicleForm vehicle={query.data} />;
}
function PageState({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{children}</div>; }
