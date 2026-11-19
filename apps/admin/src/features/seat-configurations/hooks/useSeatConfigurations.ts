import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seatConfigurationsApi } from "../services/seat-configurations.api";
import type { SeatConfigurationListParams, SeatConfigurationPayload } from "../types/seat-configuration.types";

export const seatConfigurationKeys = {
  all: ["seat-configurations"] as const,
  lists: () => [...seatConfigurationKeys.all, "list"] as const,
  list: (params: SeatConfigurationListParams) => [...seatConfigurationKeys.lists(), params] as const,
  details: () => [...seatConfigurationKeys.all, "detail"] as const,
  detail: (id: string) => [...seatConfigurationKeys.details(), id] as const,
};

export function useSeatConfigurations(params: SeatConfigurationListParams = {}) {
  return useQuery({
    queryKey: seatConfigurationKeys.list(params),
    queryFn: () => seatConfigurationsApi.list(params),
  });
}

export function useSeatConfiguration(id: string) {
  return useQuery({
    queryKey: seatConfigurationKeys.detail(id),
    queryFn: () => seatConfigurationsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCreateSeatConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SeatConfigurationPayload) => seatConfigurationsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: seatConfigurationKeys.all }),
  });
}

export function useUpdateSeatConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SeatConfigurationPayload }) =>
      seatConfigurationsApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: seatConfigurationKeys.all });
      queryClient.invalidateQueries({ queryKey: seatConfigurationKeys.detail(variables.id) });
    },
  });
}

export function useArchiveSeatConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => seatConfigurationsApi.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: seatConfigurationKeys.all }),
  });
}
