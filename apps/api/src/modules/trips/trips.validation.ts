
import { z } from "zod";

const seatTypeSchema = z.enum([
  "REGULAR",
  "PREMIUM",
  "SLEEPER",
  "RECLINER",
  "DRIVER",
  "STAFF",
]);

const tripStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "BOARDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

const stopSchema = z.object({
  routeStopId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  arrivalOffsetMinutes: z.number().int().min(0).optional().nullable(),
  departureOffsetMinutes: z.number().int().min(0).optional().nullable(),
});

const fareSchema = z.object({
  fromStopIndex: z.number().int().min(0),
  toStopIndex: z.number().int().min(1),
  amount: z.number().positive().max(999999999),
  currency: z.string().trim().length(3).default("INR").transform((v) => v.toUpperCase()),
  seatType: seatTypeSchema.optional().nullable(),
});

export const createTripSchema = z.object({
  vehicleId: z.string().uuid(),
  routeId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: tripStatusSchema.default("DRAFT"),
  currency: z.string().trim().length(3).default("INR").transform((v) => v.toUpperCase()),
  notes: z.string().trim().max(2000).optional().nullable(),
  stops: z.array(stopSchema).min(2).max(100),
  fares: z.array(fareSchema).min(1).max(500),
}).superRefine((data, ctx) => {
  if (data.endsAt <= data.startsAt) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "Trip end time must be after its start time",
    });
  }

  data.fares.forEach((fare, index) => {
    if (
      fare.fromStopIndex >= fare.toStopIndex ||
      fare.toStopIndex >= data.stops.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fares", index],
        message: "Fare must reference a valid forward journey between stops",
      });
    }
  });

  const fareKeys = data.fares.map(
    (fare) =>
      `${fare.fromStopIndex}-${fare.toStopIndex}-${fare.seatType ?? "ALL"}`,
  );

  if (new Set(fareKeys).size !== fareKeys.length) {
    ctx.addIssue({
      code: "custom",
      path: ["fares"],
      message: "Duplicate fare combinations are not allowed",
    });
  }

  data.stops.forEach((stop, index) => {
    if (
      stop.arrivalOffsetMinutes != null &&
      stop.departureOffsetMinutes != null &&
      stop.departureOffsetMinutes < stop.arrivalOffsetMinutes
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["stops", index, "departureOffsetMinutes"],
        message: "Departure offset cannot be earlier than arrival offset",
      });
    }

    if (index === 0 && stop.arrivalOffsetMinutes != null && stop.arrivalOffsetMinutes !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["stops", index, "arrivalOffsetMinutes"],
        message: "The first stop arrival offset must be zero",
      });
    }
  });
});

export const updateTripStatusSchema = z.object({
  status: tripStatusSchema,
});

export const tripIdSchema = z.object({
  id: z.string().uuid(),
});

export const tripListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  vehicleId: z.string().uuid().optional(),
  routeId: z.string().uuid().optional(),
  status: tripStatusSchema.optional(),
  startsFrom: z.coerce.date().optional(),
  startsTo: z.coerce.date().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
