
import type { Request, Response } from "express";
import { UserRole } from "../../generated/prisma/client.js";

import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";

import {
  CSRF_COOKIE,
  REFRESH_COOKIE,
  generateCsrfToken,
} from "../../common/middleware/csrf.js";

import {
  login,
  logout,
  logoutAll,
  refreshSession,
  registerCustomer,
} from "./auth.service.js";

import {
  loginSchema,
  registerSchema,
} from "./auth.validation.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: `${env.API_PREFIX}/auth`,
};

const refreshCookieMaxAge =
  env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function setAuthCookies(
  res: Response,
  refreshToken: string,
  csrfToken: string
) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: refreshCookieMaxAge,
  });

  res.cookie(CSRF_COOKIE, csrfToken, {
    ...cookieOptions,
    httpOnly: false,
    maxAge: refreshCookieMaxAge,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions);

  res.clearCookie(CSRF_COOKIE, {
    ...cookieOptions,
    httpOnly: false,
  });
}

function requestMetadata(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  };
}

export async function registerController(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);

  const result = await registerCustomer(input, requestMetadata(req));
  const csrfToken = generateCsrfToken();

  setAuthCookies(res, result.refreshToken, csrfToken);

  return res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      csrfToken,
    },
  });
}

export async function loginController(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const result = await login(
    input,
    UserRole.CUSTOMER,
    requestMetadata(req)
  );

  const csrfToken = generateCsrfToken();

  setAuthCookies(res, result.refreshToken, csrfToken);

  return res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      csrfToken,
    },
  });
}

export async function adminLoginController(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const result = await login(
    input,
    UserRole.ADMIN,
    requestMetadata(req)
  );

  const csrfToken = generateCsrfToken();

  setAuthCookies(res, result.refreshToken, csrfToken);

  return res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      csrfToken,
    },
  });
}

export async function refreshController(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (typeof refreshToken !== "string") {
    throw new AppError("UNAUTHORIZED", "Refresh token required", 401);
  }

  const result = await refreshSession(
    refreshToken,
    requestMetadata(req)
  );

  const csrfToken = generateCsrfToken();

  setAuthCookies(res, result.refreshToken, csrfToken);

  return res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      csrfToken,
    },
  });
}

export async function logoutController(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  await logout(
    typeof refreshToken === "string" ? refreshToken : undefined
  );

  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

export async function logoutAllController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  await logoutAll(req.auth.user.id);
  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "All sessions have been revoked",
  });
}

export async function meController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  return res.status(200).json({
    success: true,
    data: {
      user: req.auth.user,
      sessionId: req.auth.sessionId,
    },
  });
}
