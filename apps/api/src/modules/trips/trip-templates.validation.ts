
import { z } from "zod";

const recurrenceSchema = z.enum(["DAILY", "WEEKLY", "CUSTOM"]);

const seatTypeSchema = z.enum([
  "REGULAR",
  "PREMIUM",
  "SLEEPER",
  "RECLINER",
  "DRIVER",
  "STAFF",
]);

const templateStopSchema = z.object({
  routeStopId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  arrivalOffsetMinutes: z.number().int().min(0).optional().nullable(),
  departureOffsetMinutes: z.number().int().min(0).optional().nullable(),
});

const templateFareSchema = z.object({
  fromStopIndex: z.number().int().min(0),
  toStopIndex: z.number().int().min(1),
  amount: z.number().positive().max(999999999),
  currency: z.string().trim().length(3).default("INR").transform((v) => v.toUpperCase()),
  seatType: seatTypeSchema.optional().nullable(),
});

const templateFields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  vehicleId: z.string().uuid(),
  routeId: z.string().uuid(),
  recurrenceType: recurrenceSchema.default("DAILY"),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timeZone: z.string().trim().min(1).max(100).default("Asia/Kolkata"),
  durationMinutes: z.number().int().min(1).max(10080),
  defaultCurrency: z.string().trim().length(3).default("INR").transform((v) => v.toUpperCase()),
  stops: z.array(templateStopSchema).min(2).max(100),
  fares: z.array(templateFareSchema).min(1).max(500),
};


const validateTemplate = (
  data: Record<string, any>,
  ctx: z.RefinementCtx,
) => {
  if (
    data.startsOn &&
    data.endsOn &&
    data.endsOn < data.startsOn
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["endsOn"],
      message: "End date cannot be before start date",
    });
  }

  if (
    data.recurrenceType &&
    data.recurrenceType !== "DAILY" &&
    (!data.weekdays || data.weekdays.length === 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["weekdays"],
      message: "Select at least one weekday for this recurrence",
    });
  }

  if (
    data.weekdays &&
    new Set(data.weekdays).size !== data.weekdays.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["weekdays"],
      message: "Weekdays cannot contain duplicates",
    });
  }

  if (data.timeZone) {
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: data.timeZone,
      });
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["timeZone"],
        message: "Invalid IANA timezone",
      });
    }
  }

  if (data.stops && data.durationMinutes !== undefined) {
    let previousOffset = -1;

    data.stops.forEach((stop: z.infer<typeof templateStopSchema>, index: number) => {
      const arrival =
        stop.arrivalOffsetMinutes ?? (index === 0 ? 0 : null);

      const departure = stop.departureOffsetMinutes ?? arrival;

      if (arrival !== null && arrival < previousOffset) {
        ctx.addIssue({
          code: "custom",
          path: ["stops", index, "arrivalOffsetMinutes"],
          message: "Stop offsets must be in ascending order",
        });
      }

      if (
        arrival !== null &&
        departure !== null &&
        departure < arrival
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["stops", index, "departureOffsetMinutes"],
          message: "Departure cannot be before arrival",
        });
      }

      if (
        departure !== null &&
        departure > data.durationMinutes
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["stops", index, "departureOffsetMinutes"],
          message: "Stop offset cannot exceed trip duration",
        });
      }

      previousOffset = departure ?? arrival ?? previousOffset;
    });
  }

  if (data.stops && data.fares) {
    data.fares.forEach(
      (fare: z.infer<typeof templateFareSchema>, index: number) => {
        if (
          fare.fromStopIndex >= fare.toStopIndex ||
          fare.toStopIndex >= data.stops.length
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["fares", index],
            message: "Fare must reference a valid forward journey",
          });
        }
      },
    );

    const keys = data.fares.map(
      (fare: z.infer<typeof templateFareSchema>) =>
        `${fare.fromStopIndex}-${fare.toStopIndex}-${fare.seatType ?? "ALL"}`,
    );

    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: "custom",
        path: ["fares"],
        message: "Duplicate fare combinations are not allowed",
      });
    }
  }
};

export const createTripTemplateSchema = z
  .object(templateFields)
  .superRefine(validateTemplate);

export const updateTripTemplateSchema = z
  .object({
    name: templateFields.name.optional(),
    description: templateFields.description,
    vehicleId: templateFields.vehicleId.optional(),
    routeId: templateFields.routeId.optional(),
    recurrenceType: recurrenceSchema.optional(),
    weekdays: templateFields.weekdays.optional(),
    startsOn: templateFields.startsOn.optional(),
    endsOn: templateFields.endsOn,
    departureTime: templateFields.departureTime.optional(),
    timeZone: templateFields.timeZone.optional(),
    durationMinutes: templateFields.durationMinutes.optional(),
    defaultCurrency: templateFields.defaultCurrency.optional(),
    stops: templateFields.stops.optional(),
    fares: templateFields.fares.optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided",
      });
    }

    validateTemplate(data, ctx);
  });

export const templateIdSchema = z.object({
  id: z.string().uuid(),
});

export const templateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export const templateListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  vehicleId: z.string().uuid().optional(),
  routeId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

export const generateTripsSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(
  (data) => data.toDate >= data.fromDate,
  {
    path: ["toDate"],
    message: "End date cannot be before start date",
  },
);

export type CreateTripTemplateInput = z.infer<
  typeof createTripTemplateSchema
>;

export type UpdateTripTemplateInput = z.infer<
  typeof updateTripTemplateSchema
>;
