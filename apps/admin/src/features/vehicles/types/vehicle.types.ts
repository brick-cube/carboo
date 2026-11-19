import type { SeatType, LayoutElementType } from "../../seat-configurations/types/seat-configuration.types";

export type VehicleStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface VehicleSeat {
  id?: string;
  sourceConfigurationSeatId?: string | null;
  seatNumber: string;
  label?: string | null;
  seatType: SeatType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rowNumber?: number | null;
  columnNumber?: number | null;
  deckNumber: number;
  isBookable: boolean;
  isActive: boolean;
  priceMultiplier: number;
  metadata?: Record<string, unknown> | null;
}

export interface VehicleLayoutElement {
  id?: string;
  type: LayoutElementType;
  label?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  metadata?: Record<string, unknown> | null;
}

export interface Vehicle {
  id: string;
  name: string;
  registrationNumber: string;
  make?: string | null;
  model?: string | null;
  vehicleType?: string | null;
  description?: string | null;
  status: VehicleStatus;
  seatConfigurationId?: string | null;
  seatConfiguration?: { id: string; name: string } | null;
  totalSeats: number;
  amenities?: unknown;
  images?: unknown;
  seats?: VehicleSeat[];
  _count?: { seats?: number; trips?: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface VehiclePayload {
  name: string;
  registrationNumber: string;
  make?: string | null;
  model?: string | null;
  vehicleType?: string | null;
  description?: string | null;
  status?: VehicleStatus;
  seatConfigurationId?: string | null;
  amenities?: unknown;
  images?: unknown;
}

export interface VehicleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VehicleStatus;
  vehicleType?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface VehicleAvailability {
  vehicle: Pick<Vehicle, "id" | "name" | "registrationNumber" | "status">;
  available: boolean;
  overlappingTrips: Array<{
    id: string;
    tripCode: string;
    startsAt: string;
    endsAt: string;
    status: string;
  }>;
}

export const VEHICLE_STATUSES: VehicleStatus[] = ["ACTIVE", "INACTIVE", "MAINTENANCE"];
export const SEAT_TYPES = ["REGULAR", "PREMIUM", "SLEEPER", "RECLINER", "DRIVER", "STAFF"] as const;
export type VehicleSeatType = (typeof SEAT_TYPES)[number];
