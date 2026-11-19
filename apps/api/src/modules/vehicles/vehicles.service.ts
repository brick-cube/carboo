
import { Prisma, VehicleStatus } from "../../generated/prisma/client.js";

import { prisma } from "../../config/database.js";
import { AppError } from "../../common/errors/app-error.js";

import type {
    CreateVehicleInput,
    UpdateVehicleInput,
    VehicleSeatInput,
} from "./vehicles.validation.js";

/**
 * Converts JavaScript values into Prisma-compatible JSON values.
 * Prisma requires JsonNull for an explicit JSON null.
 */
function jsonValue(
    value: unknown
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null
        ? Prisma.JsonNull
        : (value as Prisma.InputJsonValue);
}

/**
 * Shared seat shape.
 *
 * This accepts both:
 * - VehicleSeatInput from API requests
 * - Seat configuration records returned by Prisma
 *
 * Prisma Decimal values are also supported.
 */
type SeatDataInput = {
    id?: string | undefined;
    seatNumber: string;
    label?: string | null | undefined;
    seatType: VehicleSeatInput["seatType"];
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    rowNumber?: number | null | undefined;
    columnNumber?: number | null | undefined;
    deckNumber: number;
    isBookable: boolean;
    isActive: boolean;
    priceMultiplier: number | Prisma.Decimal;
    metadata?: unknown;
};

/**
 * Converts seat data into Prisma VehicleSeat createMany input.
 *
 * sourceSeats is provided when copying a seat configuration.
 * It preserves the source configuration seat ID.
 */
function vehicleSeatData(
    vehicleId: string,
    seats: SeatDataInput[],
    sourceSeats?: Array<{
        id: string;
        seatNumber: string;
    }>
): Prisma.VehicleSeatCreateManyInput[] {
    const sourceSeatMap = new Map(
        sourceSeats?.map((seat) => [seat.seatNumber, seat.id]) ?? []
    );

    return seats.map((seat) => ({
        vehicleId,

        sourceConfigurationSeatId:
            sourceSeatMap.get(seat.seatNumber) ?? null,

        seatNumber: seat.seatNumber,
        label: seat.label ?? null,
        seatType: seat.seatType,

        x: seat.x,
        y: seat.y,
        width: seat.width,
        height: seat.height,
        rotation: seat.rotation,

        rowNumber: seat.rowNumber ?? null,
        columnNumber: seat.columnNumber ?? null,
        deckNumber: seat.deckNumber,

        isBookable: seat.isBookable,
        isActive: seat.isActive,

        priceMultiplier: Number(seat.priceMultiplier),

        ...(seat.metadata !== undefined
            ? { metadata: jsonValue(seat.metadata) }
            : {}),
    }));
}

function totalBookableSeats(
    seats: Array<{
        isBookable: boolean;
        isActive: boolean;
    }>
): number {
    return seats.filter(
        (seat) => seat.isBookable && seat.isActive
    ).length;
}

/**
 * Retrieves an active seat configuration.
 */
async function getActiveConfiguration(
    tx: Prisma.TransactionClient,
    configurationId: string
) {
    const configuration = await tx.seatConfiguration.findUnique({
        where: {
            id: configurationId,
        },
        include: {
            seats: {
                orderBy: {
                    seatNumber: "asc",
                },
            },
        },
    });

    if (!configuration || !configuration.isActive) {
        throw new AppError(
            "SEAT_CONFIGURATION_UNAVAILABLE",
            "Seat configuration does not exist or is inactive",
            400
        );
    }

    return configuration;
}

/**
 * Prevents replacing a vehicle's seat layout after trips have been created.
 *
 * Existing trips may already contain seat references and bookings.
 * Replacing their vehicle seats could invalidate those references.
 */
async function assertVehicleHasNoTrips(
    tx: Prisma.TransactionClient,
    vehicleId: string
) {
    const tripCount = await tx.trip.count({
        where: {
            vehicleId,
        },
    });

    if (tripCount > 0) {
        throw new AppError(
            "VEHICLE_LAYOUT_IN_USE",
            "The vehicle seat layout cannot be replaced because trips have already been created for this vehicle. Create a new vehicle for a different layout.",
            409
        );
    }
}

/**
 * Replaces a vehicle's seat snapshot.
 *
 * The seat configuration is a template.
 * Vehicle seats are independent snapshots copied from that template.
 */
async function replaceVehicleSeats(
    tx: Prisma.TransactionClient,
    vehicleId: string,
    seats: Prisma.VehicleSeatCreateManyInput[],
    configurationId: string | null
) {
    await assertVehicleHasNoTrips(tx, vehicleId);

    await tx.vehicleSeat.deleteMany({
        where: {
            vehicleId,
        },
    });

    if (seats.length > 0) {
        await tx.vehicleSeat.createMany({
            data: seats,
        });
    }

    await tx.vehicle.update({
        where: {
            id: vehicleId,
        },
        data: {
            seatConfigurationId: configurationId,
            totalSeats: seats.filter(
                (seat) => seat.isBookable === true && seat.isActive === true
            ).length,
        },
    });
}

const vehicleInclude = {
    seatConfiguration: {
        select: {
            id: true,
            name: true,
        },
    },
    _count: {
        select: {
            seats: true,
            trips: true,
        },
    },
};

/**
 * CREATE VEHICLE
 */
export async function createVehicle(
    input: CreateVehicleInput,
    createdById: string
) {
    try {
        return await prisma.$transaction(async (tx) => {
            let configuration:
                | Awaited<ReturnType<typeof getActiveConfiguration>>
                | null = null;

            if (input.seatConfigurationId) {
                configuration = await getActiveConfiguration(
                    tx,
                    input.seatConfigurationId
                );
            }

            const vehicle = await tx.vehicle.create({
                data: {
                    name: input.name,
                    registrationNumber: input.registrationNumber,

                    make: input.make ?? null,
                    model: input.model ?? null,
                    vehicleType: input.vehicleType ?? null,
                    description: input.description ?? null,

                    status: input.status,

                    seatConfigurationId: configuration?.id ?? null,

                    ...(input.amenities !== undefined
                        ? {
                            amenities: jsonValue(input.amenities),
                        }
                        : {}),

                    ...(input.images !== undefined
                        ? {
                            images: jsonValue(input.images),
                        }
                        : {}),

                    totalSeats: configuration
                        ? totalBookableSeats(configuration.seats)
                        : 0,

                    createdById,
                },
            });

            // Copy the configuration seats into the vehicle.
            // Future configuration changes will not affect this snapshot.
            if (configuration && configuration.seats.length > 0) {
                await tx.vehicleSeat.createMany({
                    data: vehicleSeatData(
                        vehicle.id,
                        configuration.seats,
                        configuration.seats
                    ),
                });
            }

            return tx.vehicle.findUniqueOrThrow({
                where: {
                    id: vehicle.id,
                },
                include: {
                    ...vehicleInclude,
                    seats: {
                        orderBy: {
                            seatNumber: "asc",
                        },
                    },
                },
            });
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            throw new AppError(
                "REGISTRATION_NUMBER_EXISTS",
                "A vehicle with this registration number already exists",
                409
            );
        }

        throw error;
    }
}

/**
 * LIST VEHICLES
 */
export async function listVehicles(query: {
    page: number;
    limit: number;
    search?: string;
    status?: VehicleStatus;
    vehicleType?: string;
}) {
    const where: Prisma.VehicleWhereInput = {
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),

        ...(query.vehicleType
            ? {
                vehicleType: {
                    equals: query.vehicleType,
                    mode: "insensitive",
                },
            }
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
                        registrationNumber: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        make: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        model: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                ],
            }
            : {}),
    };

    const [items, total] = await prisma.$transaction([
        prisma.vehicle.findMany({
            where,
            include: vehicleInclude,
            orderBy: {
                createdAt: "desc",
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),

        prisma.vehicle.count({
            where,
        }),
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
 * GET VEHICLE DETAILS
 */
export async function getVehicle(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
        where: {
            id,
        },
        include: {
            seatConfiguration: {
                select: {
                    id: true,
                    name: true,
                },
            },
            seats: {
                orderBy: {
                    seatNumber: "asc",
                },
            },
            _count: {
                select: {
                    trips: true,
                },
            },
        },
    });

    if (!vehicle) {
        throw new AppError(
            "VEHICLE_NOT_FOUND",
            "Vehicle not found",
            404
        );
    }

    return vehicle;
}

/**
 * UPDATE VEHICLE DETAILS
 */
export async function updateVehicle(
    id: string,
    input: UpdateVehicleInput
) {
    const existing = await prisma.vehicle.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
        },
    });

    if (!existing) {
        throw new AppError(
            "VEHICLE_NOT_FOUND",
            "Vehicle not found",
            404
        );
    }

    try {
        return await prisma.vehicle.update({
            where: {
                id,
            },
            data: {
                ...(input.name !== undefined
                    ? { name: input.name }
                    : {}),

                ...(input.registrationNumber !== undefined
                    ? {
                        registrationNumber: input.registrationNumber,
                    }
                    : {}),

                ...(input.make !== undefined
                    ? { make: input.make }
                    : {}),

                ...(input.model !== undefined
                    ? { model: input.model }
                    : {}),

                ...(input.vehicleType !== undefined
                    ? { vehicleType: input.vehicleType }
                    : {}),

                ...(input.description !== undefined
                    ? { description: input.description }
                    : {}),

                ...(input.amenities !== undefined
                    ? {
                        amenities: jsonValue(input.amenities),
                    }
                    : {}),

                ...(input.images !== undefined
                    ? {
                        images: jsonValue(input.images),
                    }
                    : {}),
            },
            include: vehicleInclude,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            throw new AppError(
                "REGISTRATION_NUMBER_EXISTS",
                "A vehicle with this registration number already exists",
                409
            );
        }

        throw error;
    }
}

/**
 * UPDATE VEHICLE STATUS
 */
export async function updateVehicleStatus(
    id: string,
    status: VehicleStatus
) {
    const vehicle = await prisma.vehicle.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
        },
    });

    if (!vehicle) {
        throw new AppError(
            "VEHICLE_NOT_FOUND",
            "Vehicle not found",
            404
        );
    }

    return prisma.vehicle.update({
        where: {
            id,
        },
        data: {
            status,
        },
        include: vehicleInclude,
    });
}

/**
 * GET VEHICLE SEATS
 */
export async function getVehicleSeats(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            name: true,
            registrationNumber: true,
            totalSeats: true,

            seatConfiguration: {
                select: {
                    id: true,
                    name: true,
                },
            },

            seats: {
                orderBy: {
                    seatNumber: "asc",
                },
            },
        },
    });

    if (!vehicle) {
        throw new AppError(
            "VEHICLE_NOT_FOUND",
            "Vehicle not found",
            404
        );
    }

    return vehicle;
}

/**
 * APPLY SEAT CONFIGURATION TO VEHICLE
 */
export async function applySeatConfiguration(
    vehicleId: string,
    configurationId: string
) {
    return prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({
            where: {
                id: vehicleId,
            },
            select: {
                id: true,
            },
        });

        if (!vehicle) {
            throw new AppError(
                "VEHICLE_NOT_FOUND",
                "Vehicle not found",
                404
            );
        }

        const configuration = await getActiveConfiguration(
            tx,
            configurationId
        );

        const seats = vehicleSeatData(
            vehicleId,
            configuration.seats,
            configuration.seats
        );

        await replaceVehicleSeats(
            tx,
            vehicleId,
            seats,
            configuration.id
        );

        return tx.vehicle.findUniqueOrThrow({
            where: {
                id: vehicleId,
            },
            include: {
                ...vehicleInclude,
                seats: {
                    orderBy: {
                        seatNumber: "asc",
                    },
                },
            },
        });
    });
}

/**
 * REPLACE VEHICLE SEATS MANUALLY
 */
export async function updateVehicleSeats(
    vehicleId: string,
    seats: VehicleSeatInput[]
) {
    return prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({
            where: {
                id: vehicleId,
            },
            select: {
                id: true,
            },
        });

        if (!vehicle) {
            throw new AppError(
                "VEHICLE_NOT_FOUND",
                "Vehicle not found",
                404
            );
        }

        const seatData = vehicleSeatData(
            vehicleId,
            seats
        );

        await replaceVehicleSeats(
            tx,
            vehicleId,
            seatData,
            null
        );

        return tx.vehicle.findUniqueOrThrow({
            where: {
                id: vehicleId,
            },
            include: {
                ...vehicleInclude,
                seats: {
                    orderBy: {
                        seatNumber: "asc",
                    },
                },
            },
        });
    });
}

/**
 * CHECK VEHICLE AVAILABILITY
 *
 * A vehicle is unavailable if:
 * - It is inactive or under maintenance.
 * - It already has a non-cancelled trip overlapping the requested period.
 *
 * The interval uses [startsAt, endsAt), so a trip ending at
 * 10:00 does not overlap another trip starting at 10:00.
 */
export async function checkVehicleAvailability(
    vehicleId: string,
    startsAt: Date,
    endsAt: Date
) {
    if (
        Number.isNaN(startsAt.getTime()) ||
        Number.isNaN(endsAt.getTime()) ||
        startsAt >= endsAt
    ) {
        throw new AppError(
            "INVALID_AVAILABILITY_RANGE",
            "The end time must be later than the start time",
            400
        );
    }

    const vehicle = await prisma.vehicle.findUnique({
        where: {
            id: vehicleId,
        },
        select: {
            id: true,
            name: true,
            registrationNumber: true,
            status: true,
        },
    });

    if (!vehicle) {
        throw new AppError(
            "VEHICLE_NOT_FOUND",
            "Vehicle not found",
            404
        );
    }

    const overlappingTrips = await prisma.trip.findMany({
        where: {
            vehicleId,
            status: {
                not: "CANCELLED",
            },
            startsAt: {
                lt: endsAt,
            },
            endsAt: {
                gt: startsAt,
            },
        },
        select: {
            id: true,
            tripCode: true,
            startsAt: true,
            endsAt: true,
            status: true,
        },
        orderBy: {
            startsAt: "asc",
        },
    });

    return {
        vehicle,

        available:
            vehicle.status === "ACTIVE" &&
            overlappingTrips.length === 0,

        overlappingTrips,
    };
}