
import type { Request, Response } from "express";

import { RouteStatus } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";

import {
    createRouteSchema,
    updateRouteSchema,
    updateRouteStatusSchema,
    routeIdSchema,
    routeListSchema,
} from "./routes.validation.js";

import {
    archiveRoute,
    createRoute,
    getRoute,
    listRoutes,
    updateRoute,
    updateRouteStatus,
} from "./routes.service.js";

function getAdminId(req: Request): string {
    if (!req.auth?.user?.id) {
        throw new AppError(
            "UNAUTHORIZED",
            "Authentication required",
            401
        );
    }

    return req.auth.user.id;
}

export async function createRouteController(
    req: Request,
    res: Response
) {
    const input = createRouteSchema.parse(req.body);

    const route = await createRoute(
        input,
        getAdminId(req)
    );

    return res.status(201).json({
        success: true,
        data: { route },
    });
}

export async function listRoutesController(
    req: Request,
    res: Response
) {
    const query = routeListSchema.parse(req.query);

    const result = await listRoutes({
        page: query.page,
        limit: query.limit,

        ...(query.search !== undefined
            ? { search: query.search }
            : {}),

        ...(query.status !== undefined
            ? { status: query.status as RouteStatus }
            : {}),
    });

    return res.status(200).json({
        success: true,
        data: result,
    });
}

export async function getRouteController(
    req: Request,
    res: Response
) {
    const { id } = routeIdSchema.parse(req.params);

    const route = await getRoute(id);

    return res.status(200).json({
        success: true,
        data: { route },
    });
}

export async function updateRouteController(
    req: Request,
    res: Response
) {
    const { id } = routeIdSchema.parse(req.params);

    const input = updateRouteSchema.parse(req.body);

    const route = await updateRoute(id, input);

    return res.status(200).json({
        success: true,
        data: { route },
    });
}

export async function updateRouteStatusController(
    req: Request,
    res: Response
) {
    const { id } = routeIdSchema.parse(req.params);

    const { status } = updateRouteStatusSchema.parse(req.body);

    const route = await updateRouteStatus(
        id,
        status as RouteStatus
    );

    return res.status(200).json({
        success: true,
        data: { route },
    });
}

export async function archiveRouteController(
    req: Request,
    res: Response
) {
    const { id } = routeIdSchema.parse(req.params);

    const route = await archiveRoute(id);

    return res.status(200).json({
        success: true,
        data: { route },
    });
}
