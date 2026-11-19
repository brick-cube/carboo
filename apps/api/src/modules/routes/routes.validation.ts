
import { z } from "zod";

const routeStopSchema = z.object({
    name: z.string().trim().min(1).max(150),

    address: z.string().trim().max(500).nullable().optional(),

    latitude: z.number().min(-90).max(90).nullable().optional(),

    longitude: z.number().min(-180).max(180).nullable().optional(),

    description: z.string().trim().max(500).nullable().optional(),
});

export const createRouteSchema = z.object({
    name: z.string().trim().min(2).max(150),

    description: z.string().trim().max(1000).nullable().optional(),

    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),

    stops: z.array(routeStopSchema).min(2).max(100),
});

export const updateRouteSchema = z.object({
    name: z.string().trim().min(2).max(150).optional(),

    description: z.string().trim().max(1000).nullable().optional(),

    stops: z.array(routeStopSchema).min(2).max(100).optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
);

export const updateRouteStatusSchema = z.object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const routeIdSchema = z.object({
    id: z.string().uuid(),
});

export const routeListSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    search: z.string().trim().optional(),

    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
