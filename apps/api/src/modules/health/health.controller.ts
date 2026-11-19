
import type { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { AppError } from "../../common/errors/app-error.js";

export function livenessCheck(
  _req: Request,
  res: Response
): void {
  res.status(200).json({
    success: true,
    data: {
      status: "alive",
      timestamp: new Date().toISOString(),
    },
  });
}

export const readinessCheck = asyncHandler(
  async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new AppError(
        "DATABASE_UNAVAILABLE",
        "The database is currently unavailable.",
        503
      );
    }

    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  }
);
