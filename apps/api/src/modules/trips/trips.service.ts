
import { randomBytes } from "node:crypto";
import {
  TripSeatSegmentStatus,
  TripStatus,
  VehicleStatus,
  RouteStatus,
  Prisma,
} from "../../generated/prisma/client.js";
import { prisma } from "../../config/database.js";
import { AppError } from "../../common/errors/app-error.js";
import type { CreateTripInput } from "./trips.validation.js";

function generateTripCode() {
  return `TR-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function validateStopOffsets(
  stops: CreateTripInput["stops"],
  durationMinutes: number,
) {
  let previousOffset = -1;

  for (const [index, stop] of stops.entries()) {
    const arrival = stop.arrivalOffsetMinutes ?? (index === 0 ? 0 : null);
    const departure = stop.departureOffsetMinutes ?? arrival;

    if (arrival !== null && arrival < previousOffset) {
      throw new AppError(
        "INVALID_STOP_TIMES",
        "Stop times must be in ascending order",
        400,
      );
    }

    if (departure !== null && departure < (arrival ?? 0)) {
      throw new AppError(
        "INVALID_STOP_TIMES",
        "Departure cannot be before arrival",
        400,
      );
    }

    if (departure !== null && departure > durationMinutes) {
      throw new AppError(
        "INVALID_STOP_TIMES",
        "Stop time cannot exceed trip duration",
        400,
      );
    }

    previousOffset = departure ?? arrival ?? previousOffset;
  }
}

function buildStopDates(
  startsAt: Date,
  endsAt: Date,
  stops: CreateTripInput["stops"],
) {
  const durationMinutes = Math.floor(
    (endsAt.getTime() - startsAt.getTime()) / 60000,
  );

  validateStopOffsets(stops, durationMinutes);

  return stops.map((stop, index) => {
    const arrivalOffset =
      stop.arrivalOffsetMinutes ?? (index === 0 ? 0 : null);

    const departureOffset =
      stop.departureOffsetMinutes ?? arrivalOffset;

    return {
      stopIndex: index,
      ...(stop.routeStopId ? { routeStopId: stop.routeStopId } : {}),
      name: stop.name,
      address: stop.address ?? null,
      latitude: stop.latitude ?? null,
      longitude: stop.longitude ?? null,
      scheduledArrivalAt:
        arrivalOffset === null
          ? null
          : new Date(startsAt.getTime() + arrivalOffset * 60000),
      scheduledDepartureAt:
        departureOffset === null
          ? null
          : new Date(startsAt.getTime() + departureOffset * 60000),
    };
  });
}

async function lockVehicleSchedule(
  tx: Prisma.TransactionClient,
  vehicleId: string,
) {
  // Serialize schedule changes for this vehicle.
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${vehicleId}))
  `;
}

async function assertNoVehicleConflict(
  tx: Prisma.TransactionClient,
  vehicleId: string,
  startsAt: Date,
  endsAt: Date,
  excludeTripId?: string,
) {
  await lockVehicleSchedule(tx, vehicleId);

  const conflict = await tx.trip.findFirst({
    where: {
      vehicleId,
      status: { not: TripStatus.CANCELLED },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
    },
    select: { id: true, tripCode: true, startsAt: true, endsAt: true },
  });

  if (conflict) {
    throw new AppError(
      "VEHICLE_SCHEDULE_CONFLICT",
      `Vehicle is already assigned to trip ${conflict.tripCode} during this period`,
      409,
    );
  }
}

export async function createTrip(
  input: CreateTripInput,
  adminId: string,
  templateId?: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id: input.vehicleId },
        select: {
          id: true,
          status: true,
          seats: {
            where: { isActive: true, isBookable: true },
            select: { id: true },
          },
        },
      });

      if (!vehicle) {
        throw new AppError("VEHICLE_NOT_FOUND", "Vehicle not found", 404);
      }

      if (vehicle.status !== VehicleStatus.ACTIVE) {
        throw new AppError(
          "VEHICLE_NOT_ACTIVE",
          "Only active vehicles can be assigned to trips",
          400,
        );
      }

      if (vehicle.seats.length === 0) {
        throw new AppError(
          "NO_BOOKABLE_SEATS",
          "This vehicle has no active bookable seats",
          400,
        );
      }

      const route = await tx.route.findUnique({
        where: { id: input.routeId },
        include: { stops: { orderBy: { stopIndex: "asc" } } },
      });

      if (!route) {
        throw new AppError("ROUTE_NOT_FOUND", "Route not found", 404);
      }

      if (route.status !== RouteStatus.ACTIVE) {
        throw new AppError(
          "ROUTE_NOT_ACTIVE",
          "Only active routes can be used for trips",
          400,
        );
      }

      const routeStopIds = new Set(route.stops.map((stop) => stop.id));

      for (const stop of input.stops) {
        if (stop.routeStopId && !routeStopIds.has(stop.routeStopId)) {
          throw new AppError(
            "INVALID_ROUTE_STOP",
            "A supplied stop does not belong to the selected route",
            400,
          );
        }
      }

      if (input.stops.length < 2) {
        throw new AppError(
          "INVALID_STOPS",
          "A trip must have at least two stops",
          400,
        );
      }

      await assertNoVehicleConflict(
        tx,
        input.vehicleId,
        input.startsAt,
        input.endsAt,
      );

      const stopDates = buildStopDates(
        input.startsAt,
        input.endsAt,
        input.stops,
      );

      const trip = await tx.trip.create({
        data: {
          tripCode: generateTripCode(),
          vehicleId: input.vehicleId,
          routeId: input.routeId,
          ...(templateId ? { templateId } : {}),
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: input.status,
          currency: input.currency,
          notes: input.notes ?? null,
          createdById: adminId,
          stops: {
            create: stopDates,
          },
          fares: {
            create: input.fares.map((fare) => ({
              fromStopIndex: fare.fromStopIndex,
              toStopIndex: fare.toStopIndex,
              amount: new Prisma.Decimal(fare.amount),
              currency: fare.currency,
              seatType: fare.seatType ?? null,
            })),
          },
          seatSegments: {
            createMany: {
              data: vehicle.seats.flatMap((seat) =>
                Array.from(
                  { length: input.stops.length - 1 },
                  (_, segmentIndex) => ({
                    vehicleSeatId: seat.id,
                    segmentIndex,
                    status: TripSeatSegmentStatus.AVAILABLE,
                  }),
                ),
              ),
            },
          },
        },
        include: {
          vehicle: true,
          route: true,
          stops: { orderBy: { stopIndex: "asc" } },
          fares: true,
          _count: { select: { seatSegments: true } },
        },
      });

      return trip;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000,
    },
  );
}

export async function listTrips(query: {
  page: number;
  limit: number;
  search?: string;
  vehicleId?: string;
  routeId?: string;
  status?: TripStatus;
  startsFrom?: Date;
  startsTo?: Date;
}) {
  const where: Prisma.TripWhereInput = {
    ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
    ...(query.routeId ? { routeId: query.routeId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { tripCode: { contains: query.search, mode: "insensitive" } },
            { vehicle: { name: { contains: query.search, mode: "insensitive" } } },
            { route: { name: { contains: query.search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(query.startsFrom || query.startsTo
      ? {
          startsAt: {
            ...(query.startsFrom ? { gte: query.startsFrom } : {}),
            ...(query.startsTo ? { lte: query.startsTo } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.trip.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { startsAt: "desc" },
      include: {
        vehicle: { select: { id: true, name: true, registrationNumber: true } },
        route: { select: { id: true, name: true } },
        _count: {
          select: { seatSegments: true, bookings: true },
        },
      },
    }),
    prisma.trip.count({ where }),
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

export async function getTrip(id: string) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      vehicle: {
        include: {
          seats: { orderBy: { seatNumber: "asc" } },
        },
      },
      route: true,
      stops: { orderBy: { stopIndex: "asc" } },
      fares: { orderBy: [{ fromStopIndex: "asc" }, { toStopIndex: "asc" }] },
      seatSegments: {
        include: { vehicleSeat: true },
        orderBy: [{ segmentIndex: "asc" }],
      },
      _count: { select: { bookings: true } },
    },
  });

  if (!trip) {
    throw new AppError("TRIP_NOT_FOUND", "Trip not found", 404);
  }

  return trip;
}

const allowedTransitions: Record<TripStatus, TripStatus[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["BOARDING", "CANCELLED"],
  BOARDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateTripStatus(id: string, status: TripStatus) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      _count: { select: { bookings: true } },
    },
  });

  if (!trip) {
    throw new AppError("TRIP_NOT_FOUND", "Trip not found", 404);
  }

  if (trip.status === status) return trip;

  if (!allowedTransitions[trip.status].includes(status)) {
    throw new AppError(
      "INVALID_TRIP_STATUS_TRANSITION",
      `Cannot change trip status from ${trip.status} to ${status}`,
      400,
    );
  }

  if (status === TripStatus.CANCELLED && trip._count.bookings > 0) {
    throw new AppError(
      "TRIP_HAS_BOOKINGS",
      "This trip has bookings. Handle cancellations and refunds before cancelling it.",
      409,
    );
  }

  return prisma.trip.update({
    where: { id },
    data: { status },
  });
}
