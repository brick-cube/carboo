
import {
  UserRole,
  UserStatus,
} from "../../generated/prisma/client.js";

import { prisma } from "../../config/database.js";
import { AppError } from "../../common/errors/app-error.js";
import {
  hashPassword,
  verifyPassword,
} from "../../common/utils/password.js";

import type {
  updateProfileSchema,
  changePasswordSchema,
} from "./users.validation.js";

import type { z } from "zod";

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  return user;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
) {
  const data = {
    ...(input.name !== undefined
      ? { name: input.name }
      : {}),

    ...(input.phone !== undefined
      ? { phone: input.phone }
      : {}),
  };

  return prisma.user.update({
    where: { id: userId },
    data,
    select: safeUserSelect,
  });
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  const valid = await verifyPassword(
    user.passwordHash,
    input.currentPassword
  );

  if (!valid) {
    throw new AppError(
      "INVALID_CURRENT_PASSWORD",
      "Current password is incorrect",
      400
    );
  }

  const newPasswordHash = await hashPassword(input.newPassword);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    }),
  ]);
}

export async function listUsers(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: safeUserSelect,
    }),
    prisma.user.count(),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  return user;
}

export async function updateUserStatus(
  adminId: string,
  targetUserId: string,
  status: UserStatus
) {
  if (adminId === targetUserId) {
    throw new AppError(
      "CANNOT_CHANGE_OWN_STATUS",
      "You cannot change your own account status",
      400
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!target) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  // The current role model has no SUPER_ADMIN role.
  // Ordinary admins cannot disable or modify other admin accounts.
  if (target.role === UserRole.ADMIN) {
    throw new AppError(
      "ADMIN_ACCOUNT_PROTECTED",
      "Admin accounts cannot be modified through this endpoint",
      403
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data: { status },
      select: safeUserSelect,
    });

    if (status !== UserStatus.ACTIVE) {
      await tx.authSession.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return user;
  });

  return updated;
}
