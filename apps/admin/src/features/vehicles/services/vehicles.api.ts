import api from "../../../lib/api";
import type {
  Paginated,
  Vehicle,
  VehicleAvailability,
  VehicleListParams,
  VehiclePayload,
  VehicleSeat,
  VehicleStatus,
} from "../types/vehicle.types";

function unwrap(response: { data: unknown }): any {
  const body = response.data as any;
  return body && typeof body === "object" && "data" in body ? body.data : body;
}

function unwrapVehicle(response: { data: unknown }): Vehicle {
  const data = unwrap(response);
  return (data?.vehicle ?? data) as Vehicle;
}

export const vehiclesApi = {
  async list(params: VehicleListParams = {}): Promise<Paginated<Vehicle>> {
    const data = unwrap(await api.get("/vehicles", { params }));
    if (Array.isArray(data)) {
      return {
        items: data as Vehicle[],
        pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 },
      };
    }
    const items = (data?.items ?? data?.vehicles ?? []) as Vehicle[];
    const pagination = data?.pagination ?? {};
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

  async get(id: string): Promise<Vehicle> {
    return unwrapVehicle(await api.get(`/vehicles/${id}`));
  },

  async create(payload: VehiclePayload): Promise<Vehicle> {
    return unwrapVehicle(await api.post("/vehicles", payload));
  },

  async update(id: string, payload: Partial<VehiclePayload>): Promise<Vehicle> {
    return unwrapVehicle(await api.patch(`/vehicles/${id}`, payload));
  },

  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    return unwrapVehicle(await api.patch(`/vehicles/${id}/status`, { status }));
  },

  async getSeats(id: string): Promise<Vehicle> {
    const data = unwrap(await api.get(`/vehicles/${id}/seats`));
    return (data?.vehicle ?? data) as Vehicle;
  },

  async updateSeats(id: string, seats: VehicleSeat[]): Promise<Vehicle> {
    return unwrapVehicle(await api.put(`/vehicles/${id}/seats`, {
      seats: seats.map(({ id: _id, sourceConfigurationSeatId: _sourceId, ...seat }) => seat),
    }));
  },

  async applySeatConfiguration(id: string, seatConfigurationId: string): Promise<Vehicle> {
    return unwrapVehicle(await api.put(`/vehicles/${id}/seat-configuration`, { seatConfigurationId }));
  },

  async availability(id: string, startsAt: string, endsAt: string): Promise<VehicleAvailability> {
    const data = unwrap(await api.get(`/vehicles/${id}/availability`, {
      params: { startsAt, endsAt },
    }));
    return data as VehicleAvailability;
  },
};
