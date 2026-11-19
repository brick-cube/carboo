import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vehiclesApi } from "../services/vehicles.api";
import type { VehicleListParams, VehiclePayload, VehicleStatus } from "../types/vehicle.types";

export const vehicleKeys = {
  all: ["vehicles"] as const,
  lists: () => [...vehicleKeys.all, "list"] as const,
  list: (params: VehicleListParams) => [...vehicleKeys.lists(), params] as const,
  details: () => [...vehicleKeys.all, "detail"] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
  seats: (id: string) => [...vehicleKeys.all, "seats", id] as const,
};

export function useVehicles(params: VehicleListParams = {}) {
  return useQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: () => vehiclesApi.list(params),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => vehiclesApi.get(id),
    enabled: Boolean(id),
  });
}

export function useVehicleSeats(id: string) {
  return useQuery({
    queryKey: vehicleKeys.seats(id),
    queryFn: () => vehiclesApi.getSeats(id),
    enabled: Boolean(id),
  });
}

export function useCreateVehicle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: VehiclePayload) => vehiclesApi.create(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}

export function useUpdateVehicle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<VehiclePayload> }) =>
      vehiclesApi.update(id, payload),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: vehicleKeys.all });
      client.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
    },
  });
}

export function useUpdateVehicleStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleStatus }) =>
      vehiclesApi.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: vehicleKeys.all });
      client.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
    },
  });
}

export function useUpdateVehicleSeats() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, seats }: { id: string; seats: import("../types/vehicle.types").VehicleSeat[] }) =>
      vehiclesApi.updateSeats(id, seats),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
      client.invalidateQueries({ queryKey: vehicleKeys.seats(variables.id) });
      client.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useApplyVehicleSeatConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, seatConfigurationId }: { id: string; seatConfigurationId: string }) =>
      vehiclesApi.applySeatConfiguration(id, seatConfigurationId),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
      client.invalidateQueries({ queryKey: vehicleKeys.seats(variables.id) });
      client.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}
