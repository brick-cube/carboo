
import type { Request, Response } from "express";
import { UserStatus } from "../../generated/prisma/client.js";

import { AppError } from "../../common/errors/app-error.js";

import {
    changePasswordSchema,
    updateProfileSchema,
    updateUserStatusSchema,
    userListQuerySchema,
} from "./users.validation.js";

import {
    changePassword,
    getProfile,
    getUserById,
    listUsers,
    updateProfile,
    updateUserStatus,
} from "./users.service.js";

export async function getMyProfileController(
    req: Request,
    res: Response
) {
    if (!req.auth) {
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const user = await getProfile(req.auth.user.id);

    return res.status(200).json({
        success: true,
        data: { user },
    });
}

export async function updateMyProfileController(
    req: Request,
    res: Response
) {
    if (!req.auth) {
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = updateProfileSchema.parse(req.body);
    const user = await updateProfile(req.auth.user.id, input);

    return res.status(200).json({
        success: true,
        data: { user },
    });
}

export async function changeMyPasswordController(
    req: Request,
    res: Response
) {
    if (!req.auth) {
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = changePasswordSchema.parse(req.body);

    await changePassword(req.auth.user.id, input);

    return res.status(200).json({
        success: true,
        message: "Password changed. Please log in again on your devices.",
    });
}

export async function listUsersController(
    req: Request,
    res: Response
) {
    const query = userListQuerySchema.parse(req.query);
    const result = await listUsers(query.page, query.limit);

    return res.status(200).json({
        success: true,
        data: result,
    });
}

export async function getUserController(
    req: Request,
    res: Response
) {
    const userId = getRouteUserId(req);
    const user = await getUserById(userId);

    return res.status(200).json({
        success: true,
        data: { user },
    });
}

export async function updateUserStatusController(
    req: Request,
    res: Response
) {
    if (!req.auth) {
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const { status } = updateUserStatusSchema.parse(req.body);

    const userId = getRouteUserId(req);

    const user = await updateUserStatus(
        req.auth.user.id,
        userId,
        status
    );

    return res.status(200).json({
        success: true,
        data: { user },
    });
}

function getRouteUserId(req: Request): string {
    const id = req.params.id;

    if (typeof id !== "string" || !id.trim()) {
        throw new AppError("INVALID_USER_ID", "Invalid user ID", 400);
    }

    return id;
}