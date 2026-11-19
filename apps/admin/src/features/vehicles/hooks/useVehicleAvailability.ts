import { useQuery } from "@tanstack/react-query";
import { vehiclesApi } from "../services/vehicles.api";

export function useVehicleAvailability(
  id: string,
  startsAt: string,
  endsAt: string,
  enabled = false,
) {
  return useQuery({
    queryKey: ["vehicles", id, "availability", startsAt, endsAt],
    queryFn: () => vehiclesApi.availability(id, startsAt, endsAt),
    enabled: Boolean(id && startsAt && endsAt && enabled),
  });
}
