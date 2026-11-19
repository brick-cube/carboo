
import type { Request, Response } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { VehicleStatus } from "../../generated/prisma/client.js";

import {
  applySeatConfigurationSchema,
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleSeatsSchema,
  updateVehicleStatusSchema,
  vehicleAvailabilitySchema,
  vehicleIdSchema,
  vehicleListSchema,
} from "./vehicles.validation.js";

import {
  applySeatConfiguration,
  checkVehicleAvailability,
  createVehicle,
  getVehicle,
  getVehicleSeats,
  listVehicles,
  updateVehicle,
  updateVehicleSeats,
  updateVehicleStatus,
} from "./vehicles.service.js";

function getAdminId(req: Request): string {
  if (!req.auth?.user.id) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  return req.auth.user.id;
}

export async function createVehicleController(
  req: Request,
  res: Response
) {
  const input = createVehicleSchema.parse(req.body);

  const vehicle = await createVehicle(input, getAdminId(req));

  return res.status(201).json({
    success: true,
    data: { vehicle },
  });
}


export async function listVehiclesController(
    req: Request,
    res: Response
) {
    const query = vehicleListSchema.parse(req.query);

    const result = await listVehicles({
        page: query.page,
        limit: query.limit,

        ...(query.search !== undefined
            ? { search: query.search }
            : {}),

        ...(query.status !== undefined
            ? { status: query.status as VehicleStatus }
            : {}),

        ...(query.vehicleType !== undefined
            ? { vehicleType: query.vehicleType }
            : {}),
    });

    return res.status(200).json({
        success: true,
        data: result,
    });
}

export async function getVehicleController(
  req: Request,
  res: Response
) {
  const { id } = vehicleIdSchema.parse(req.params);
  const vehicle = await getVehicle(id);

  return res.status(200).json({
    success: true,
    data: { vehicle },
  });
}

export async function updateVehicleController(
  req: Request,
  res: Response
) {
  const { id } = vehicleIdSchema.parse(req.params);
  const input = updateVehicleSchema.parse(req.body);

  const vehicle = await updateVehicle(id, input);

  return res.status(200).json({
    success: true,
    data: { vehicle },
  });
}

export async function updateVehicleStatusController(
  req: Request,
  res: Response
) {
  const { id } = vehicleIdSchema.parse(req.params);
  const { status } = updateVehicleStatusSchema.parse(req.body);

  const vehicle = await updateVehicleStatus(
    id,
    status as VehicleStatus
  );

  return res.status(200).json({
    success: true,
    data: { vehicle },
  });
}

export async function getVehicleSeatsController(
  req: Request,
  res: Response
) {
  const { id } = vehicleIdSchema.parse(req.params);
  const vehicle = await getVehicleSeats(id);

  return res.status(200).json({
    success: true,
    data: { vehicle },
  });
}

export async function applySeatConfigurationController(
  req: Request,
  res: Response
) {
  const { id } = vehicleIdSchema.parse(req.params);
  const { seatConfigurationId } =
    applySeatConfigurationSchema.parse(req.body);

  const vehicle = await applySeatConfiguration(
    id,
    seatConfigurationId
  );

  return res.status(200).json({
    success: true,
    data: { vehicle },
  });
}

export async function updateVehicleSeatsController(
  req: Request,
  res: Response
) {
  const { id } = vehicleIdSchema.parse(req.params);
  const input = updateVehicleSeatsSchema.parse(req.body);

  const vehicle = await updateVehicleSeats(id, input.seats);

  return res.status(200).json({
    success: true,
    data: { vehicle },
  });
}

export async function checkVehicleAvailabilityController(
    req: Request,
    res: Response
) {
    const { id } = vehicleIdSchema.parse(req.params);

    const query = vehicleAvailabilitySchema.parse(req.query);

    const result = await checkVehicleAvailability(
        id,
        new Date(query.startsAt),
        new Date(query.endsAt)
    );

    return res.status(200).json({
        success: true,
        data: result,
    });
}