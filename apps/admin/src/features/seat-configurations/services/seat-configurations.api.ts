import api from "../../../lib/api";
import type {
  Paginated,
  SeatConfiguration,
  SeatConfigurationListParams,
  SeatConfigurationPayload,
} from "../types/seat-configuration.types";

function unwrap<T>(response: { data: unknown }): T {
  let value = response.data as Record<string, unknown>;
  if (value && typeof value === "object" && "data" in value) {
    value = value.data as Record<string, unknown>;
  }
  return value as T;
}

function unwrapConfiguration(response: { data: unknown }): SeatConfiguration {
  const value = unwrap<Record<string, unknown>>(response);
  if (value && typeof value === "object" && "configuration" in value) {
    return value.configuration as SeatConfiguration;
  }
  return value as unknown as SeatConfiguration;
}

export const seatConfigurationsApi = {
  async list(params: SeatConfigurationListParams = {}): Promise<Paginated<SeatConfiguration>> {
    const response = await api.get("/seat-configurations", { params });
    const value = unwrap<Record<string, unknown>>(response);
    if (Array.isArray(value)) {
      return { items: value as SeatConfiguration[], pagination: { page: 1, limit: value.length, total: value.length, totalPages: 1 } };
    }
    const items = (value.items ?? value.configurations ?? []) as SeatConfiguration[];
    const pagination = (value.pagination ?? {}) as Partial<Paginated<SeatConfiguration>["pagination"]>;
    return {
      items,
      pagination: {
        page: pagination.page ?? params.page ?? 1,
        limit: pagination.limit ?? params.limit ?? items.length,
        total: pagination.total ?? items.length,
        totalPages: pagination.totalPages ?? 1,
      },
    };
  },

  async get(id: string): Promise<SeatConfiguration> {
    const response = await api.get(`/seat-configurations/${id}`);
    return unwrapConfiguration(response);
  },

  async create(payload: SeatConfigurationPayload): Promise<SeatConfiguration> {
    const response = await api.post("/seat-configurations", payload);
    return unwrapConfiguration(response);
  },

  async update(id: string, payload: SeatConfigurationPayload): Promise<SeatConfiguration> {
    const response = await api.patch(`/seat-configurations/${id}`, payload);
    return unwrapConfiguration(response);
  },

  async archive(id: string): Promise<void> {
    await api.delete(`/seat-configurations/${id}`);
  },
};
