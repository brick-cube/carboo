
import type { RequestHandler } from "express";

import { prisma } from "../../config/database.js";
import { UserStatus } from "../../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/token.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const token = authorization.slice(7);
    const { userId, sessionId } = verifyAccessToken(token);

    const session = await prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!session || session.user.status !== UserStatus.ACTIVE) {
      throw new AppError("UNAUTHORIZED", "Session is invalid or expired", 401);
    }

    req.auth = {
      sessionId,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone,
        role: session.user.role,
        status: session.user.status,
      },
    };

    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("UNAUTHORIZED", "Invalid or expired access token", 401)
    );
  }
};
