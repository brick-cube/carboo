
import { z } from "zod";

const seatTypeSchema = z.enum([
  "REGULAR",
  "PREMIUM",
  "SLEEPER",
  "RECLINER",
  "DRIVER",
  "STAFF",
]);

const elementTypeSchema = z.enum([
  "AISLE",
  "DOOR",
  "STAIRCASE",
  "DRIVER_AREA",
  "WHEEL",
  "WINDOW",
  "TABLE",
  "OTHER",
]);

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional();

const seatSchema = z.object({
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

const elementSchema = z.object({
  type: elementTypeSchema,
  label: z.string().trim().max(100).nullable().optional(),

  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(1).max(2000).default(40),
  height: z.number().int().min(1).max(2000).default(40),
  rotation: z.number().int().min(0).max(359).default(0),

  metadata: metadataSchema,
});

// Keep this as a plain object schema.
// Do not add refine/superRefine here because update uses partial().
const layoutObjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullable().optional(),

  canvasWidth: z.number().int().min(100).max(3000).default(600),
  canvasHeight: z.number().int().min(100).max(3000).default(400),

  seats: z.array(seatSchema).default([]),
  elements: z.array(elementSchema).default([]),
});

// Shared layout validation

function validateLayout(
  data: {
    canvasWidth?: number | undefined;
    canvasHeight?: number | undefined;
    seats?:
      | Array<{
          seatNumber: string;
          x: number;
          y: number;
          width: number;
          height: number;
        }>
      | undefined;
    elements?:
      | Array<{
          x: number;
          y: number;
          width: number;
          height: number;
        }>
      | undefined;
  },
  ctx: z.RefinementCtx,
) {
  const seatNumbers = data.seats?.map((seat) => seat.seatNumber) ?? [];

  if (new Set(seatNumbers).size !== seatNumbers.length) {
    ctx.addIssue({
      code: "custom",
      path: ["seats"],
      message: "Seat numbers must be unique within a layout",
    });
  }

  if (
    data.canvasWidth !== undefined &&
    data.canvasHeight !== undefined
  ) {
    data.seats?.forEach((seat, index) => {
      if (
        seat.x + seat.width > data.canvasWidth! ||
        seat.y + seat.height > data.canvasHeight!
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["seats", index],
          message: "Seat must fit within the layout canvas",
        });
      }
    });

    data.elements?.forEach((element, index) => {
      if (
        element.x + element.width > data.canvasWidth! ||
        element.y + element.height > data.canvasHeight!
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["elements", index],
          message: "Element must fit within the layout canvas",
        });
      }
    });
  }
}

// CREATE
export const createSeatConfigurationSchema =
  layoutObjectSchema.superRefine((data, ctx) => {
    validateLayout(data, ctx);
  });

// UPDATE
export const updateSeatConfigurationSchema = layoutObjectSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided",
      });
    }

    validateLayout(data, ctx);
  });

export const seatConfigurationIdSchema = z.object({
  id: z.string().uuid(),
});

export const seatConfigurationListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export type CreateSeatConfigurationInput = z.infer<
  typeof createSeatConfigurationSchema
>;

export type UpdateSeatConfigurationInput = z.infer<
  typeof updateSeatConfigurationSchema
>;