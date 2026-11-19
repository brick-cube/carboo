
import type { RequestHandler } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";

export function authorize(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      return next(new AppError("UNAUTHORIZED", "Authentication required", 401));
    }

    if (!roles.includes(req.auth.user.role)) {
      return next(new AppError("FORBIDDEN", "You do not have permission", 403));
    }

    next();
  };
}
