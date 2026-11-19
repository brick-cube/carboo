
import { randomUUID } from "node:crypto";
import pino from "pino";
import { pinoHttp } from "pino-http";

import type { IncomingMessage, ServerResponse } from "node:http";

import { env } from "../../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
      "*.password",
      "*.passwordHash",
      "*.refreshToken",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },

  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export const requestLogger = pinoHttp({
  logger,

  genReqId(
    _req: IncomingMessage,
    res: ServerResponse
  ) {
    const requestId = randomUUID();

    res.setHeader("X-Request-ID", requestId);

    return requestId;
  },

  customLogLevel(
    _req: IncomingMessage,
    res: ServerResponse,
    err?: Error
  ) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";

    return "info";
  },
});