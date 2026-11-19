
import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { AppError } from "../../common/errors/app-error.js";
import {
    createTripSchema,
    tripIdSchema,
    tripListSchema,
    updateTripStatusSchema,
} from "./trips.validation.js";
import {
    createTrip,
    getTrip,
    listTrips,
    updateTripStatus,
} from "./trips.service.js";

function getAdminId(req: Request) {
    const id = req.auth?.user?.id;

    if (!id) {
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    return id;
}

export const createTripController = asyncHandler(
    async (req: Request, res: Response) => {
        const input = createTripSchema.parse(req.body);
        const trip = await createTrip(input, getAdminId(req));

        res.status(201).json({
            success: true,
            data: trip,
        });
    },
);

export const listTripsController = asyncHandler(
    async (req: Request, res: Response) => {
        const query = tripListSchema.parse(req.query);
        const result = await listTrips({
            page: query.page,
            limit: query.limit,
            ...(query.search !== undefined ? { search: query.search } : {}),
            ...(query.vehicleId !== undefined
                ? { vehicleId: query.vehicleId }
                : {}),
            ...(query.routeId !== undefined ? { routeId: query.routeId } : {}),
            ...(query.status !== undefined ? { status: query.status } : {}),
            ...(query.startsFrom !== undefined
                ? { startsFrom: query.startsFrom }
                : {}),
            ...(query.startsTo !== undefined ? { startsTo: query.startsTo } : {}),
        });

        res.status(200).json({
            success: true,
            data: result.items,
            pagination: result.pagination,
        });
    },
);

export const getTripController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = tripIdSchema.parse(req.params);
        const trip = await getTrip(id);

        res.status(200).json({
            success: true,
            data: trip,
        });
    },
);

export const updateTripStatusController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = tripIdSchema.parse(req.params);
        const { status } = updateTripStatusSchema.parse(req.body);

        const trip = await updateTripStatus(id, status);

        res.status(200).json({
            success: true,
            data: trip,
        });
    },
);
