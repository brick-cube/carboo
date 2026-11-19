
import { Prisma, TripTemplateStatus, TripStatus, VehicleStatus, RouteStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../config/database.js";
import { AppError } from "../../common/errors/app-error.js";
import { createTrip } from "./trips.service.js";
import type {
  CreateTripTemplateInput,
  UpdateTripTemplateInput,
} from "./trip-templates.validation.js";

function dateString(value: Date | string) {
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

function dateFromString(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function localDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const target = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);
  let guess = target;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  // Recalculate the UTC instant until it represents the requested
  // wall-clock time in the specified timezone.
  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(new Date(guess));
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    const represented = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );

    guess += target - represented;
  }

  const result = new Date(guess);
  const check = Object.fromEntries(
    formatter.formatToParts(result).map((part) => [part.type, part.value]),
  );

  if (
    Number(check.year) !== year ||
    Number(check.month) !== month ||
    Number(check.day) !== day ||
    Number(check.hour) !== hour ||
    Number(check.minute) !== minute
  ) {
    throw new AppError(
      "INVALID_LOCAL_DEPARTURE_TIME",
      `The local departure time ${date} ${time} does not exist in ${timeZone}, possibly due to a daylight-saving transition`,
      400,
    );
  }

  return result;
}

function dateRange(fromDate: string, toDate: string) {
  const dates: string[] = [];
  const cursor = dateFromString(fromDate);
  const end = dateFromString(toDate);

  while (cursor <= end) {
    dates.push(dateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function isScheduledDate(
  date: string,
  recurrenceType: "DAILY" | "WEEKLY" | "CUSTOM",
  weekdays: number[],
) {
  if (recurrenceType === "DAILY") return true;

  const weekday = dateFromString(date).getUTCDay();
  return weekdays.includes(weekday);
}

async function validateTemplateReferences(
  vehicleId: string,
  routeId: string,
  stops: CreateTripTemplateInput["stops"],
) {
  const [vehicle, route] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, status: true, seats: { where: { isActive: true, isBookable: true }, select: { id: true } } },
    }),
    prisma.route.findUnique({
      where: { id: routeId },
      include: { stops: { select: { id: true } } },
    }),
  ]);

  if (!vehicle) {
    throw new AppError("VEHICLE_NOT_FOUND", "Vehicle not found", 404);
  }

  if (vehicle.status !== VehicleStatus.ACTIVE) {
    throw new AppError("VEHICLE_NOT_ACTIVE", "Vehicle is not active", 400);
  }

  if (vehicle.seats.length === 0) {
    throw new AppError("NO_BOOKABLE_SEATS", "Vehicle has no bookable seats", 400);
  }

  if (!route) {
    throw new AppError("ROUTE_NOT_FOUND", "Route not found", 404);
  }

  if (route.status !== RouteStatus.ACTIVE) {
    throw new AppError("ROUTE_NOT_ACTIVE", "Route is not active", 400);
  }

  const routeStopIds = new Set(route.stops.map((stop) => stop.id));

  for (const stop of stops) {
    if (stop.routeStopId && !routeStopIds.has(stop.routeStopId)) {
      throw new AppError(
        "INVALID_ROUTE_STOP",
        "A template stop does not belong to the selected route",
        400,
      );
    }
  }
}

function mapTemplateStops(stops: CreateTripTemplateInput["stops"]) {
  return stops.map((stop, index) => ({
    stopIndex: index,
    routeStopId: stop.routeStopId ?? null,
    name: stop.name,
    address: stop.address ?? null,
    latitude: stop.latitude ?? null,
    longitude: stop.longitude ?? null,
    arrivalOffsetMinutes: stop.arrivalOffsetMinutes ?? null,
    departureOffsetMinutes: stop.departureOffsetMinutes ?? null,
  }));
}

function mapTemplateFares(fares: CreateTripTemplateInput["fares"]) {
  return fares.map((fare) => ({
    fromStopIndex: fare.fromStopIndex,
    toStopIndex: fare.toStopIndex,
    amount: new Prisma.Decimal(fare.amount),
    currency: fare.currency,
    seatType: fare.seatType ?? null,
  }));
}

export async function createTripTemplate(
  input: CreateTripTemplateInput,
  adminId: string,
) {
  await validateTemplateReferences(
    input.vehicleId,
    input.routeId,
    input.stops,
  );

  return prisma.tripTemplate.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      vehicleId: input.vehicleId,
      routeId: input.routeId,
      recurrenceType: input.recurrenceType,
      weekdays: input.weekdays,
      startsOn: dateFromString(input.startsOn),
      endsOn: input.endsOn ? dateFromString(input.endsOn) : null,
      departureTime: input.departureTime,
      timeZone: input.timeZone,
      durationMinutes: input.durationMinutes,
      defaultCurrency: input.defaultCurrency,
      createdById: adminId,
      stops: {
        create: mapTemplateStops(input.stops),
      },
      fares: {
        create: mapTemplateFares(input.fares),
      },
    },
    include: {
      vehicle: true,
      route: true,
      stops: { orderBy: { stopIndex: "asc" } },
      fares: { orderBy: [{ fromStopIndex: "asc" }, { toStopIndex: "asc" }] },
    },
  });
}

export async function listTripTemplates(query: {
  page: number;
  limit: number;
  search?: string;
  vehicleId?: string;
  routeId?: string;
  status?: TripTemplateStatus;
}) {
  const where: Prisma.TripTemplateWhereInput = {
    ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
    ...(query.routeId ? { routeId: query.routeId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { vehicle: { name: { contains: query.search, mode: "insensitive" } } },
            { route: { name: { contains: query.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.tripTemplate.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: { select: { id: true, name: true, registrationNumber: true } },
        route: { select: { id: true, name: true } },
        _count: { select: { trips: true } },
      },
    }),
    prisma.tripTemplate.count({ where }),
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

export async function getTripTemplate(id: string) {
  const template = await prisma.tripTemplate.findUnique({
    where: { id },
    include: {
      vehicle: true,
      route: true,
      stops: { orderBy: { stopIndex: "asc" } },
      fares: { orderBy: [{ fromStopIndex: "asc" }, { toStopIndex: "asc" }] },
      _count: { select: { trips: true } },
    },
  });

  if (!template) {
    throw new AppError("TEMPLATE_NOT_FOUND", "Trip template not found", 404);
  }

  return template;
}

export async function updateTripTemplate(
  id: string,
  input: UpdateTripTemplateInput,
) {
  const existing = await getTripTemplate(id);

  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const routeId = input.routeId ?? existing.routeId;

  const mergedStops = input.stops ?? existing.stops.map((stop) => ({
    routeStopId: stop.routeStopId,
    name: stop.name,
    address: stop.address,
    latitude: stop.latitude,
    longitude: stop.longitude,
    arrivalOffsetMinutes: stop.arrivalOffsetMinutes,
    departureOffsetMinutes: stop.departureOffsetMinutes,
  }));

  const mergedFares = input.fares ?? existing.fares.map((fare) => ({
    fromStopIndex: fare.fromStopIndex,
    toStopIndex: fare.toStopIndex,
    amount: Number(fare.amount),
    currency: fare.currency,
    seatType: fare.seatType,
  }));

  for (const fare of mergedFares) {
    if (
      fare.fromStopIndex >= fare.toStopIndex ||
      fare.toStopIndex >= mergedStops.length
    ) {
      throw new AppError(
        "INVALID_TEMPLATE_FARE",
        "A fare references an invalid stop combination",
        400,
      );
    }
  }

  await validateTemplateReferences(vehicleId, routeId, mergedStops);

  return prisma.$transaction(async (tx) => {
    return tx.tripTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.vehicleId !== undefined ? { vehicleId: input.vehicleId } : {}),
        ...(input.routeId !== undefined ? { routeId: input.routeId } : {}),
        ...(input.recurrenceType !== undefined ? { recurrenceType: input.recurrenceType } : {}),
        ...(input.weekdays !== undefined ? { weekdays: input.weekdays } : {}),
        ...(input.startsOn !== undefined ? { startsOn: dateFromString(input.startsOn) } : {}),
        ...(input.endsOn !== undefined ? { endsOn: input.endsOn ? dateFromString(input.endsOn) : null } : {}),
        ...(input.departureTime !== undefined ? { departureTime: input.departureTime } : {}),
        ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
        ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
        ...(input.defaultCurrency !== undefined ? { defaultCurrency: input.defaultCurrency } : {}),
        ...(input.stops !== undefined
          ? {
              stops: {
                deleteMany: {},
                create: mapTemplateStops(input.stops),
              },
            }
          : {}),
        ...(input.fares !== undefined
          ? {
              fares: {
                deleteMany: {},
                create: mapTemplateFares(input.fares),
              },
            }
          : {}),
      },
      include: {
        vehicle: true,
        route: true,
        stops: { orderBy: { stopIndex: "asc" } },
        fares: { orderBy: [{ fromStopIndex: "asc" }, { toStopIndex: "asc" }] },
      },
    });
  });
}

export async function updateTripTemplateStatus(
  id: string,
  status: TripTemplateStatus,
) {
  await getTripTemplate(id);

  return prisma.tripTemplate.update({
    where: { id },
    data: { status },
  });
}

export async function generateTripsFromTemplate(
  id: string,
  fromDate: string,
  toDate: string,
) {
  const template = await getTripTemplate(id);

  if (template.status !== TripTemplateStatus.ACTIVE) {
    throw new AppError(
      "TEMPLATE_NOT_ACTIVE",
      "Only active templates can generate trips",
      400,
    );
  }

  if (toDate < fromDate) {
    throw new AppError("INVALID_DATE_RANGE", "Invalid date range", 400);
  }

  const range = dateRange(fromDate, toDate);

  if (range.length > 90) {
    throw new AppError(
      "DATE_RANGE_TOO_LARGE",
      "Generate trips for a maximum of 90 days at a time",
      400,
    );
  }

  const templateStart = dateString(template.startsOn);
  const templateEnd = template.endsOn
    ? dateString(template.endsOn)
    : null;

  const generated = [];
  const skipped: string[] = [];

  for (const date of range) {
    if (date < templateStart || (templateEnd && date > templateEnd)) {
      continue;
    }

    if (
      !isScheduledDate(
        date,
        template.recurrenceType,
        template.weekdays,
      )
    ) {
      continue;
    }

    const startsAt = localDateTimeToUtc(
      date,
      template.departureTime,
      template.timeZone,
    );

    const existing = await prisma.trip.findFirst({
      where: {
        templateId: id,
        startsAt,
      },
      select: { id: true, tripCode: true },
    });

    if (existing) {
      skipped.push(date);
      continue;
    }

    const endsAt = new Date(
      startsAt.getTime() + template.durationMinutes * 60000,
    );

    try {
      const trip = await createTrip(
        {
          vehicleId: template.vehicleId,
          routeId: template.routeId,
          startsAt,
          endsAt,
          status: TripStatus.SCHEDULED,
          currency: template.defaultCurrency,
          notes: `Generated from template: ${template.name}`,
          stops: template.stops.map((stop) => ({
            routeStopId: stop.routeStopId,
            name: stop.name,
            address: stop.address,
            latitude: stop.latitude,
            longitude: stop.longitude,
            arrivalOffsetMinutes: stop.arrivalOffsetMinutes,
            departureOffsetMinutes: stop.departureOffsetMinutes,
          })),
          fares: template.fares.map((fare) => ({
            fromStopIndex: fare.fromStopIndex,
            toStopIndex: fare.toStopIndex,
            amount: Number(fare.amount),
            currency: fare.currency,
            seatType: fare.seatType,
          })),
        },
        template.createdById ?? "",
        template.id,
      );

      generated.push(trip);
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === "VEHICLE_SCHEDULE_CONFLICT"
      ) {
        skipped.push(date);
        continue;
      }

      throw error;
    }
  }

  return {
    generated,
    generatedCount: generated.length,
    skippedDates: skipped,
    skippedCount: skipped.length,
  };
}
