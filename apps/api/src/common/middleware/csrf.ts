
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

export const REFRESH_COOKIE = "carboo_refresh";
export const CSRF_COOKIE = "carboo_csrf";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export const csrfProtection: RequestHandler = (req, _res, next) => {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get("X-CSRF-Token");

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    cookieToken.length !== headerToken.length
  ) {
    return next(
      new AppError("CSRF_VALIDATION_FAILED", "CSRF validation failed", 403)
    );
  }

  const valid = timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );

  if (!valid) {
    return next(
      new AppError("CSRF_VALIDATION_FAILED", "CSRF validation failed", 403)
    );
  }

  next();
};
