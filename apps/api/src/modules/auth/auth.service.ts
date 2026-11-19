
import { UserRole, UserStatus } from "../../generated/prisma/client.js";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/app-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../../common/utils/token.js";
import {
  hashPassword,
  verifyPassword,
} from "../../common/utils/password.js";
import type { AuthenticatedUser } from "./auth.types.js";
import type { RegisterInput, LoginInput } from "./auth.validation.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
} as const;

// A second refresh request arriving shortly after a successful rotation
// is treated as a concurrent request, not immediate token theft.
const REFRESH_ROTATION_GRACE_MS = 5_000;

function refreshExpiry(): Date {
  return new Date(
    Date.now() + env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
}

function isWithinRotationGrace(rotationCompletedAt: Date | null): boolean {
  if (!rotationCompletedAt) return false;

  const elapsed = Date.now() - rotationCompletedAt.getTime();

  return elapsed >= 0 && elapsed <= REFRESH_ROTATION_GRACE_MS;
}

async function revokeActiveSessions(userId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function createSession(
  userId: string,
  userAgent?: string | null,
  ipAddress?: string | null
) {
  const refreshToken = generateRefreshToken();

  const session = await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiry(),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    },
  });

  return {
    refreshToken,
    sessionId: session.id,
    accessToken: generateAccessToken(userId, session.id),
  };
}

export async function registerCustomer(
  input: RegisterInput,
  metadata: { userAgent?: string | null; ipAddress?: string | null }
) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("EMAIL_ALREADY_EXISTS", "Email is already registered", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
    select: userSelect,
  });

  const session = await createSession(
    user.id,
    metadata.userAgent,
    metadata.ipAddress
  );

  return { user, ...session };
}

export async function login(
  input: LoginInput,
  allowedRole: UserRole,
  metadata: { userAgent?: string | null; ipAddress?: string | null }
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !user.passwordHash) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  const validPassword = await verifyPassword(
    user.passwordHash,
    input.password
  );

  if (!validPassword || user.role !== allowedRole) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError("ACCOUNT_UNAVAILABLE", "This account is unavailable", 403);
  }

  const session = await createSession(
    user.id,
    metadata.userAgent,
    metadata.ipAddress
  );

  const safeUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  };

  return { user: safeUser, ...session };
}

export async function refreshSession(
  refreshToken: string,
  metadata: { userAgent?: string | null; ipAddress?: string | null }
) {
  const tokenHash = hashRefreshToken(refreshToken);

  const oldSession = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!oldSession) {
    throw new AppError("INVALID_REFRESH_TOKEN", "Invalid refresh token", 401);
  }

  // A token revoked by a recent successful rotation may belong to a
  // simultaneous request from the same browser.
  if (oldSession.revokedAt) {
    if (isWithinRotationGrace(oldSession.rotationCompletedAt)) {
      throw new AppError(
        "REFRESH_TOKEN_ROTATION_CONFLICT",
        "A refresh request is already being processed. Please retry using your current session.",
        409
      );
    }

    // Outside the grace period, treat reuse of a rotated token as replay.
    if (oldSession.rotationCompletedAt) {
      await revokeActiveSessions(oldSession.userId);

      throw new AppError(
        "REFRESH_TOKEN_REUSE",
        "Session security check failed. Please log in again.",
        401
      );
    }

    // A revoked token that was not rotated is no longer valid.
    throw new AppError(
      "INVALID_REFRESH_TOKEN",
      "Invalid refresh token",
      401
    );
  }

  const now = new Date();

  if (oldSession.expiresAt <= now) {
    await prisma.authSession.updateMany({
      where: {
        id: oldSession.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    throw new AppError(
      "REFRESH_TOKEN_EXPIRED",
      "Please log in again",
      401
    );
  }

  if (oldSession.user.status !== UserStatus.ACTIVE) {
    await revokeActiveSessions(oldSession.userId);

    throw new AppError(
      "ACCOUNT_UNAVAILABLE",
      "This account is unavailable",
      403
    );
  }

  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRefreshToken);

  // The conditional update is the atomic claim. PostgreSQL ensures that
  // only one concurrent request can change this session from active to
  // revoked with a rotation timestamp.
  const newSession = await prisma.$transaction(async (tx) => {
    const result = await tx.authSession.updateMany({
      where: {
        id: oldSession.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        revokedAt: now,
        rotationCompletedAt: now,
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return tx.authSession.create({
      data: {
        userId: oldSession.userId,
        tokenHash: newTokenHash,
        expiresAt: refreshExpiry(),
        userAgent: metadata.userAgent ?? null,
        ipAddress: metadata.ipAddress ?? null,
      },
    });
  });

  if (!newSession) {
    // Re-read after the transaction. If another request won the race,
    // its rotation timestamp will now be visible.
    const latestSession = await prisma.authSession.findUnique({
      where: { id: oldSession.id },
      select: {
        revokedAt: true,
        rotationCompletedAt: true,
        expiresAt: true,
      },
    });

    if (
      latestSession?.revokedAt &&
      isWithinRotationGrace(latestSession.rotationCompletedAt)
    ) {
      throw new AppError(
        "REFRESH_TOKEN_ROTATION_CONFLICT",
        "A refresh request is already being processed. Please retry using your current session.",
        409
      );
    }

    if (
      latestSession &&
      !latestSession.revokedAt &&
      latestSession.expiresAt <= new Date()
    ) {
      await prisma.authSession.updateMany({
        where: {
          id: oldSession.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new AppError(
        "REFRESH_TOKEN_EXPIRED",
        "Please log in again",
        401
      );
    }

    // Only a confirmed previous rotation outside the grace window
    // is treated as refresh-token replay.
    if (latestSession?.rotationCompletedAt) {
      await revokeActiveSessions(oldSession.userId);

      throw new AppError(
        "REFRESH_TOKEN_REUSE",
        "Session security check failed. Please log in again.",
        401
      );
    }

    throw new AppError(
      "INVALID_REFRESH_TOKEN",
      "Invalid refresh token",
      401
    );
  }

  const user: AuthenticatedUser = {
    id: oldSession.user.id,
    name: oldSession.user.name,
    email: oldSession.user.email,
    phone: oldSession.user.phone,
    role: oldSession.user.role,
    status: oldSession.user.status,
  };

  return {
    user,
    refreshToken: newRefreshToken,
    sessionId: newSession.id,
    accessToken: generateAccessToken(user.id, newSession.id),
  };
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return;

  await prisma.authSession.updateMany({
    where: {
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string) {
  await revokeActiveSessions(userId);
}