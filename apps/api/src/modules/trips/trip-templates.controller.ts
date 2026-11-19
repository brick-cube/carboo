
import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { AppError } from "../../common/errors/app-error.js";
import {
    createTripTemplateSchema,
    generateTripsSchema,
    templateIdSchema,
    templateListSchema,
    templateStatusSchema,
    updateTripTemplateSchema,
} from "./trip-templates.validation.js";
import {
    createTripTemplate,
    generateTripsFromTemplate,
    getTripTemplate,
    listTripTemplates,
    updateTripTemplate,
    updateTripTemplateStatus,
} from "./trip-templates.service.js";

function getAdminId(req: Request) {
    const id = req.auth?.user?.id;

    if (!id) {
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    return id;
}

export const createTripTemplateController = asyncHandler(
    async (req: Request, res: Response) => {
        const input = createTripTemplateSchema.parse(req.body);
        const template = await createTripTemplate(input, getAdminId(req));

        res.status(201).json({
            success: true,
            data: template,
        });
    },
);

export const listTripTemplatesController = asyncHandler(
    async (req: Request, res: Response) => {
        const query = templateListSchema.parse(req.query);
        const result = await listTripTemplates({
            page: query.page,
            limit: query.limit,
            ...(query.search !== undefined ? { search: query.search } : {}),
            ...(query.vehicleId !== undefined
                ? { vehicleId: query.vehicleId }
                : {}),
            ...(query.routeId !== undefined ? { routeId: query.routeId } : {}),
            ...(query.status !== undefined ? { status: query.status } : {}),
        });

        res.status(200).json({
            success: true,
            data: result.items,
            pagination: result.pagination,
        });
    },
);

export const getTripTemplateController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = templateIdSchema.parse(req.params);
        const template = await getTripTemplate(id);

        res.status(200).json({
            success: true,
            data: template,
        });
    },
);

export const updateTripTemplateController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = templateIdSchema.parse(req.params);
        const input = updateTripTemplateSchema.parse(req.body);

        const template = await updateTripTemplate(id, input);

        res.status(200).json({
            success: true,
            data: template,
        });
    },
);

export const updateTripTemplateStatusController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = templateIdSchema.parse(req.params);
        const { status } = templateStatusSchema.parse(req.body);

        const template = await updateTripTemplateStatus(id, status);

        res.status(200).json({
            success: true,
            data: template,
        });
    },
);

export const generateTripsController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = templateIdSchema.parse(req.params);
        const { fromDate, toDate } = generateTripsSchema.parse(req.body);

        const result = await generateTripsFromTemplate(
            id,
            fromDate,
            toDate,
        );

        res.status(200).json({
            success: true,
            data: result,
        });
    },
);
