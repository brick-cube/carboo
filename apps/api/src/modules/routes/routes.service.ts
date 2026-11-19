
import { Prisma, RouteStatus } from "../../generated/prisma/client.js";

import { prisma } from "../../config/database.js";
import { AppError } from "../../common/errors/app-error.js";

import type {
    createRouteSchema,
    updateRouteSchema,
} from "./routes.validation.js";

import type { z } from "zod";

type CreateRouteInput = z.infer<typeof createRouteSchema>;
type UpdateRouteInput = z.infer<typeof updateRouteSchema>;

const routeInclude = {
    stops: {
        orderBy: {
            stopIndex: "asc" as const,
        },
    },
    _count: {
        select: {
            trips: true,
            tripTemplates: true,
        },
    },
};

/**
 * CREATE ROUTE
 */
export async function createRoute(
    input: CreateRouteInput,
    createdById: string
) {
    return prisma.route.create({
        data: {
            name: input.name,
            description: input.description ?? null,
            status: input.status as RouteStatus,
            createdById,

            stops: {
                create: input.stops.map((stop, index) => ({
                    stopIndex: index,
                    name: stop.name,
                    address: stop.address ?? null,
                    latitude: stop.latitude ?? null,
                    longitude: stop.longitude ?? null,
                    description: stop.description ?? null,
                })),
            },
        },
        include: routeInclude,
    });
}

/**
 * LIST ROUTES
 */
export async function listRoutes(query: {
    page: number;
    limit: number;
    search?: string;
    status?: RouteStatus;
}) {
    const where: Prisma.RouteWhereInput = {
        ...(query.status !== undefined
            ? { status: query.status }
            : {}),

        ...(query.search
            ? {
                OR: [
                    {
                        name: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        description: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                ],
            }
            : {}),
    };

    const [items, total] = await prisma.$transaction([
        prisma.route.findMany({
            where,
            include: routeInclude,
            orderBy: {
                createdAt: "desc",
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),

        prisma.route.count({ where }),
    ]);

    return {
        items,
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
}

/**
 * GET ROUTE
 */
export async function getRoute(id: string) {
    const route = await prisma.route.findUnique({
        where: { id },
        include: routeInclude,
    });

    if (!route) {
        throw new AppError(
            "ROUTE_NOT_FOUND",
            "Route not found",
            404
        );
    }

    return route;
}

/**
 * UPDATE ROUTE
 *
 * Stop structure cannot be replaced once trips or recurring
 * templates reference the route.
 */
export async function updateRoute(
    id: string,
    input: UpdateRouteInput
) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.route.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        trips: true,
                        tripTemplates: true,
                    },
                },
            },
        });

        if (!existing) {
            throw new AppError(
                "ROUTE_NOT_FOUND",
                "Route not found",
                404
            );
        }

        if (
            input.stops !== undefined &&
            (
                existing._count.trips > 0 ||
                existing._count.tripTemplates > 0
            )
        ) {
            throw new AppError(
                "ROUTE_STOPS_IN_USE",
                "Route stops cannot be replaced after trips or recurring templates have been created. Create a new route instead.",
                409
            );
        }

        await tx.route.update({
            where: { id },
            data: {
                ...(input.name !== undefined
                    ? { name: input.name }
                    : {}),

                ...(input.description !== undefined
                    ? { description: input.description }
                    : {}),
            },
        });

        if (input.stops !== undefined) {
            await tx.routeStop.deleteMany({
                where: { routeId: id },
            });

            await tx.routeStop.createMany({
                data: input.stops.map((stop, index) => ({
                    routeId: id,
                    stopIndex: index,
                    name: stop.name,
                    address: stop.address ?? null,
                    latitude: stop.latitude ?? null,
                    longitude: stop.longitude ?? null,
                    description: stop.description ?? null,
                })),
            });
        }

        return tx.route.findUniqueOrThrow({
            where: { id },
            include: routeInclude,
        });
    });
}

/**
 * UPDATE ROUTE STATUS
 */
export async function updateRouteStatus(
    id: string,
    status: RouteStatus
) {
    const existing = await prisma.route.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!existing) {
        throw new AppError(
            "ROUTE_NOT_FOUND",
            "Route not found",
            404
        );
    }

    return prisma.route.update({
        where: { id },
        data: { status },
        include: routeInclude,
    });
}

/**
 * ARCHIVE ROUTE
 *
 * We use INACTIVE instead of deleting route records.
 * Historical trips may reference the route.
 */
export async function archiveRoute(id: string) {
    return updateRouteStatus(id, RouteStatus.INACTIVE);
}
