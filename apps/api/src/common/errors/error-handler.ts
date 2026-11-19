
import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";
import { logger } from "../middleware/request-logger.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (res.headersSent) {
    return;
  }

  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred.";
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed.";

    details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request contains invalid JSON.";
  } else if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    const prismaCode = error.code;

    if (prismaCode === "P2002") {
      statusCode = 409;
      code = "RESOURCE_ALREADY_EXISTS";
      message = "A record with these details already exists.";
    } else if (prismaCode === "P2025") {
      statusCode = 404;
      code = "RESOURCE_NOT_FOUND";
      message = "The requested record was not found.";
    } else if (prismaCode === "P2003") {
      statusCode = 409;
      code = "RELATION_CONSTRAINT_ERROR";
      message = "This operation conflicts with related records.";
    }
  }

  if (statusCode >= 500) {
    logger.error({ err: error }, "Unhandled API error");
  } else {
    logger.warn(
      { code, statusCode },
      "API request failed"
    );
  }

  res.status(statusCode).json({
    success: false,

    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
};
