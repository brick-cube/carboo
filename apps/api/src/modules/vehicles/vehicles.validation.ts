
import { z } from "zod";

const vehicleStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "MAINTENANCE",
]);

const seatTypeSchema = z.enum([
  "REGULAR",
  "PREMIUM",
  "SLEEPER",
  "RECLINER",
  "DRIVER",
  "STAFF",
]);

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional();

export const createVehicleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  registrationNumber: z.string().trim().min(2).max(30)
    .transform((value) => value.toUpperCase()),

  make: z.string().trim().max(100).nullable().optional(),
  model: z.string().trim().max(100).nullable().optional(),
  vehicleType: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),

  status: vehicleStatusSchema.default("ACTIVE"),

  seatConfigurationId: z.string().uuid().nullable().optional(),

  amenities: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  images: z.array(z.string().url()).max(30).optional(),
});

export const updateVehicleSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  registrationNumber: z.string().trim().min(2).max(30)
    .transform((value) => value.toUpperCase()).optional(),

  make: z.string().trim().max(100).nullable().optional(),
  model: z.string().trim().max(100).nullable().optional(),
  vehicleType: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),

  amenities: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  images: z.array(z.string().url()).max(30).optional(),
});

export const updateVehicleStatusSchema = z.object({
  status: vehicleStatusSchema,
});

export const vehicleIdSchema = z.object({
  id: z.string().uuid(),
});

export const vehicleListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: vehicleStatusSchema.optional(),
  vehicleType: z.string().trim().max(100).optional(),
});

const vehicleSeatSchema = z.object({
  seatNumber: z.string().trim().min(1).max(30),
  label: z.string().trim().max(50).nullable().optional(),
  seatType: seatTypeSchema.default("REGULAR"),

  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(1).max(1000).default(50),
  height: z.number().int().min(1).max(1000).default(50),
  rotation: z.number().int().min(0).max(359).default(0),

  rowNumber: z.number().int().min(1).nullable().optional(),
  columnNumber: z.number().int().min(1).nullable().optional(),
  deckNumber: z.number().int().min(1).default(1),

  isBookable: z.boolean().default(true),
  isActive: z.boolean().default(true),

  priceMultiplier: z.number().min(0).max(100).default(1),
  metadata: metadataSchema,
});

export const updateVehicleSeatsSchema = z.object({
  seats: z.array(vehicleSeatSchema).max(300),
}).superRefine((data, ctx) => {
  const seatNumbers = data.seats.map((seat) => seat.seatNumber);

  if (new Set(seatNumbers).size !== seatNumbers.length) {
    ctx.addIssue({
      code: "custom",
      path: ["seats"],
      message: "Seat numbers must be unique",
    });
  }
});

export const applySeatConfigurationSchema = z.object({
  seatConfigurationId: z.string().uuid(),
});

export const vehicleAvailabilitySchema = z.object({
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
}).refine(
  (data) => new Date(data.endsAt) > new Date(data.startsAt),
  {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  }
);

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleSeatInput = z.infer<typeof vehicleSeatSchema>;
