
import type { Request, Response } from "express";
import { AppError } from "../../common/errors/app-error.js";

import {
    createSeatConfigurationSchema,
    updateSeatConfigurationSchema,
    seatConfigurationIdSchema,
    seatConfigurationListSchema,
} from "./seat-configurations.validation.js";

import {
    createSeatConfiguration,
    deactivateSeatConfiguration,
    getSeatConfiguration,
    listSeatConfigurations,
    updateSeatConfiguration,
} from "./seat-configurations.service.js";

function getAdminId(req: Request): string {
    if (!req.auth?.user.id) {
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    return req.auth.user.id;
}

export async function createSeatConfigurationController(
    req: Request,
    res: Response
) {
    const input = createSeatConfigurationSchema.parse(req.body);

    const configuration = await createSeatConfiguration(
        input,
        getAdminId(req)
    );

    return res.status(201).json({
        success: true,
        data: { configuration },
    });
}

export async function listSeatConfigurationsController(
    req: Request,
    res: Response
) {
    const query = seatConfigurationListSchema.parse(req.query);
    const result = await listSeatConfigurations({
        page: query.page,
        limit: query.limit,
        ...(query.search !== undefined ? { search: query.search } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    });

    return res.status(200).json({
        success: true,
        data: result,
    });
}

export async function getSeatConfigurationController(
    req: Request,
    res: Response
) {
    const { id } = seatConfigurationIdSchema.parse(req.params);
    const configuration = await getSeatConfiguration(id);

    return res.status(200).json({
        success: true,
        data: { configuration },
    });
}

export async function updateSeatConfigurationController(
    req: Request,
    res: Response
) {
    const { id } = seatConfigurationIdSchema.parse(req.params);
    const input = updateSeatConfigurationSchema.parse(req.body);

    const configuration = await updateSeatConfiguration(id, input);

    return res.status(200).json({
        success: true,
        data: { configuration },
    });
}

export async function deactivateSeatConfigurationController(
    req: Request,
    res: Response
) {
    const { id } = seatConfigurationIdSchema.parse(req.params);
    const configuration = await deactivateSeatConfiguration(id);

    return res.status(200).json({
        success: true,
        data: { configuration },
    });
}
