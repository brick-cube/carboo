import type { Vehicle, VehicleStatus } from "../types/vehicle.types";

export function getVehicleErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { error?: { message?: string }; message?: string } } }).response;
    return response?.data?.error?.message ?? response?.data?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function getVehicleStatusLabel(status: VehicleStatus) {
  return status === "ACTIVE" ? "Active" : status === "INACTIVE" ? "Inactive" : "Maintenance";
}

export function getVehicleSeatCount(vehicle: Vehicle) {
  return vehicle.totalSeats ?? vehicle._count?.seats ?? vehicle.seats?.filter((seat) => seat.isActive && seat.isBookable).length ?? 0;
}

export function formatVehicleType(value?: string | null) {
  if (!value) return "Not specified";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function parseJsonList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}
