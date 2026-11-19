export type SeatType =
  | "REGULAR"
  | "PREMIUM"
  | "SLEEPER"
  | "RECLINER"
  | "DRIVER"
  | "STAFF";

export type LayoutElementType =
  | "AISLE"
  | "DOOR"
  | "STAIRCASE"
  | "DRIVER_AREA"
  | "WHEEL"
  | "WINDOW"
  | "TABLE"
  | "OTHER";

export interface LayoutSeat {
  id?: string;
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

export interface LayoutElement {
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

export interface SeatConfiguration {
  id: string;
  name: string;
  description?: string | null;
  canvasWidth: number;
  canvasHeight: number;
  isActive: boolean;
  seats: LayoutSeat[];
  elements: LayoutElement[];
  _count?: { seats?: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatConfigurationPayload {
  name: string;
  description: string | null;
  canvasWidth: number;
  canvasHeight: number;
  seats: LayoutSeat[];
  elements: LayoutElement[];
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

export interface SeatConfigurationListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
