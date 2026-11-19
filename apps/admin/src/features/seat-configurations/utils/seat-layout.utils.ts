import type { LayoutElement, LayoutElementType, LayoutSeat, SeatType } from "../types/seat-configuration.types";

export const DEFAULT_CANVAS = { width: 360, height: 760 };
export const SEAT_WIDTH = 48;
export const SEAT_HEIGHT = 54;

export const seatTypeLabels: Record<SeatType, string> = {
  REGULAR: "Regular",
  PREMIUM: "Premium",
  SLEEPER: "Sleeper",
  RECLINER: "Recliner",
  DRIVER: "Driver",
  STAFF: "Staff",
};

export const elementLabels: Record<LayoutElementType, string> = {
  AISLE: "Aisle",
  DOOR: "Door",
  STAIRCASE: "Staircase",
  DRIVER_AREA: "Driver area",
  WHEEL: "Wheel",
  WINDOW: "Window",
  TABLE: "Table",
  OTHER: "Other",
};

export function nextSeatNumber(seats: LayoutSeat[]): string {
  let index = 1;
  while (seats.some((seat) => seat.seatNumber.toUpperCase() === `S${index}`)) index += 1;
  return `S${index}`;
}

export function createSeat(seats: LayoutSeat[]): LayoutSeat {
  const row = Math.floor(seats.length / 3);
  const column = seats.length % 3;
  // Default 2 + aisle + 1 arrangement. The editor can move every seat freely.
  const xPositions = [22, 86, 258];
  const x = xPositions[column] ?? 22;
  return {
    seatNumber: nextSeatNumber(seats),
    label: null,
    seatType: "REGULAR",
    x,
    y: 32 + row * 72,
    width: SEAT_WIDTH,
    height: SEAT_HEIGHT,
    rotation: 0,
    rowNumber: row + 1,
    columnNumber: column + 1,
    deckNumber: 1,
    isBookable: true,
    isActive: true,
    priceMultiplier: 1,
    metadata: null,
  };
}

export function createElement(type: LayoutElementType, index: number): LayoutElement {
  const defaults: Record<LayoutElementType, Pick<LayoutElement, "width" | "height">> = {
    AISLE: { width: 42, height: 520 },
    DOOR: { width: 64, height: 28 },
    STAIRCASE: { width: 52, height: 64 },
    DRIVER_AREA: { width: 92, height: 72 },
    WHEEL: { width: 34, height: 34 },
    WINDOW: { width: 72, height: 12 },
    TABLE: { width: 70, height: 48 },
    OTHER: { width: 64, height: 40 },
  };
  const size = defaults[type];
  return {
    type,
    label: elementLabels[type],
    x: type === "AISLE" ? 158 : 12 + (index % 3) * 86,
    y: type === "AISLE" ? 100 : 18 + index * 42,
    width: size.width,
    height: size.height,
    rotation: 0,
    metadata: null,
  };
}

export function validateLayout(
  seats: LayoutSeat[],
  elements: LayoutElement[],
  canvasWidth: number,
  canvasHeight: number,
): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(canvasWidth) || canvasWidth < 280 || canvasWidth > 1200) {
    errors.push("Canvas width must be between 280 and 1200 pixels.");
  }
  if (!Number.isFinite(canvasHeight) || canvasHeight < 400 || canvasHeight > 2400) {
    errors.push("Canvas height must be between 400 and 2400 pixels.");
  }
  if (seats.length === 0) errors.push("Add at least one seat to the layout.");

  const normalizedNumbers = seats.map((seat) => seat.seatNumber.trim().toUpperCase());
  if (normalizedNumbers.some((number) => !number)) errors.push("Every seat must have a seat number.");
  if (new Set(normalizedNumbers).size !== normalizedNumbers.length) errors.push("Seat numbers must be unique.");

  for (const seat of seats) {
    if (!seat.seatNumber.trim()) continue;
    if (seat.width <= 0 || seat.height <= 0) errors.push(`${seat.seatNumber}: width and height must be greater than zero.`);
    if (seat.x < 0 || seat.y < 0 || seat.x + seat.width > canvasWidth || seat.y + seat.height > canvasHeight) {
      errors.push(`${seat.seatNumber} is outside the layout canvas.`);
    }
    if (!Number.isFinite(seat.priceMultiplier) || seat.priceMultiplier <= 0) {
      errors.push(`${seat.seatNumber}: price multiplier must be greater than zero.`);
    }
  }

  for (const element of elements) {
    if (element.width <= 0 || element.height <= 0) errors.push(`${elementLabels[element.type]} must have a positive size.`);
    if (element.x < 0 || element.y < 0 || element.x + element.width > canvasWidth || element.y + element.height > canvasHeight) {
      errors.push(`${elementLabels[element.type]} is outside the layout canvas.`);
    }
  }
  return [...new Set(errors)];
}
