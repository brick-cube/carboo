
import { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../config/database.js";
import { AppError } from "../../common/errors/app-error.js";

import type {
    CreateSeatConfigurationInput,
    UpdateSeatConfigurationInput,
} from "./seat-configurations.validation.js";

const seatConfigurationInclude = {
    seats: {
        orderBy: { seatNumber: "asc" as const },
    },
    elements: {
        orderBy: { createdAt: "asc" as const },
    },
    _count: {
        select: { vehicles: true },
    },
};

function jsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null
        ? Prisma.JsonNull
        : (value as Prisma.InputJsonValue);
}

async function createLayoutChildren(
    tx: Prisma.TransactionClient,
    configurationId: string,
    input: Pick<CreateSeatConfigurationInput, "seats" | "elements">
) {
    if (input.seats.length) {
        await tx.seatConfigurationSeat.createMany({
            data: input.seats.map((seat) =>
                seatCreateData(configurationId, seat)
            ),
        });
    }

    if (input.elements.length) {
        await tx.seatConfigurationElement.createMany({
            data: input.elements.map((element) =>
                elementCreateData(configurationId, element)
            ),
        });
    }
}

export async function createSeatConfiguration(
    input: CreateSeatConfigurationInput,
    createdById: string
) {
    return prisma.$transaction(async (tx) => {
        const configuration = await tx.seatConfiguration.create({
            data: {
                name: input.name,
                description: input.description ?? null,
                canvasWidth: input.canvasWidth,
                canvasHeight: input.canvasHeight,
                createdById,
            },
        });

        await createLayoutChildren(tx, configuration.id, input);

        return tx.seatConfiguration.findUniqueOrThrow({
            where: { id: configuration.id },
            include: seatConfigurationInclude,
        });
    });
}

export async function listSeatConfigurations(query: {
    page: number;
    limit: number;
    search?: string;
    isActive?: "true" | "false";
}) {
    const where: Prisma.SeatConfigurationWhereInput = {
        ...(query.search
            ? {
                name: {
                    contains: query.search,
                    mode: "insensitive",
                },
            }
            : {}),
        ...(query.isActive !== undefined
            ? { isActive: query.isActive === "true" }
            : {}),
    };

    const [items, total] = await prisma.$transaction([
        prisma.seatConfiguration.findMany({
            where,
            include: {
                _count: {
                    select: {
                        seats: true,
                        elements: true,
                        vehicles: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
        prisma.seatConfiguration.count({ where }),
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

export async function getSeatConfiguration(id: string) {
    const configuration = await prisma.seatConfiguration.findUnique({
        where: { id },
        include: seatConfigurationInclude,
    });

    if (!configuration) {
        throw new AppError(
            "SEAT_CONFIGURATION_NOT_FOUND",
            "Seat configuration not found",
            404
        );
    }

    return configuration;
}

export async function updateSeatConfiguration(
    id: string,
    input: UpdateSeatConfigurationInput
) {
    const existing = await prisma.seatConfiguration.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!existing) {
        throw new AppError(
            "SEAT_CONFIGURATION_NOT_FOUND",
            "Seat configuration not found",
            404
        );
    }

    return prisma.$transaction(async (tx) => {
        await tx.seatConfiguration.update({
            where: { id },
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && {
                    description: input.description,
                }),
                ...(input.canvasWidth !== undefined && {
                    canvasWidth: input.canvasWidth,
                }),
                ...(input.canvasHeight !== undefined && {
                    canvasHeight: input.canvasHeight,
                }),
                ...(input.isActive !== undefined && {
                    isActive: input.isActive,
                }),
            },
        });

        // Replacing template seats/elements only changes the reusable template.
        if (input.seats !== undefined) {
            await tx.seatConfigurationSeat.deleteMany({
                where: { seatConfigurationId: id },
            });

            if (input.seats.length) {
                await tx.seatConfigurationSeat.createMany({
                    data: input.seats.map((seat) =>
                        seatCreateData(id, seat)
                    ),
                });
            }
        }

        if (input.elements !== undefined) {
            await tx.seatConfigurationElement.deleteMany({
                where: { seatConfigurationId: id },
            });

            if (input.elements.length) {
                await tx.seatConfigurationElement.createMany({
                    data: input.elements.map((element) =>
                        elementCreateData(id, element)
                    ),
                });
            }
        }

        return tx.seatConfiguration.findUniqueOrThrow({
            where: { id },
            include: seatConfigurationInclude,
        });
    });
}

export async function deactivateSeatConfiguration(id: string) {
    const configuration = await prisma.seatConfiguration.findUnique({
        where: { id },
        select: { id: true, isActive: true },
    });

    if (!configuration) {
        throw new AppError(
            "SEAT_CONFIGURATION_NOT_FOUND",
            "Seat configuration not found",
            404
        );
    }

    return prisma.seatConfiguration.update({
        where: { id },
        data: { isActive: false },
    });
}

function seatCreateData(
    configurationId: string,
    seat: CreateSeatConfigurationInput["seats"][number]
): Prisma.SeatConfigurationSeatCreateManyInput {
    return {
        seatConfigurationId: configurationId,
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
        priceMultiplier: seat.priceMultiplier,
        ...(seat.metadata !== undefined
            ? { metadata: jsonValue(seat.metadata) }
            : {}),
    };
}

function elementCreateData(
    configurationId: string,
    element: CreateSeatConfigurationInput["elements"][number]
): Prisma.SeatConfigurationElementCreateManyInput {
    return {
        seatConfigurationId: configurationId,
        type: element.type,
        label: element.label ?? null,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        ...(element.metadata !== undefined
            ? { metadata: jsonValue(element.metadata) }
            : {}),
    };
}