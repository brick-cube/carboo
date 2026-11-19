
import type { Server } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.js";
import { logger } from "./common/middleware/request-logger.js";

let server: Server | undefined;
let isShuttingDown = false;

async function shutdown(reason: string): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;

  logger.info({ reason }, "Shutting down API");

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await disconnectDatabase();

    logger.info("API shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.fatal({ err: error }, "Error during shutdown");
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          environment: env.NODE_ENV,
          prefix: env.API_PREFIX,
        },
        "API server started"
      );
    });

    server.on("error", (error) => {
      logger.fatal({ err: error }, "HTTP server error");
      void shutdown("server-error");
    });
  } catch (error) {
    logger.fatal({ err: error }, "API startup failed");

    await disconnectDatabase().catch((disconnectError) => {
      logger.error(
        { err: disconnectError },
        "Database cleanup failed"
      );
    });

    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal(
    { err: reason },
    "Unhandled promise rejection"
  );

  void shutdown("unhandled-rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal(
    { err: error },
    "Uncaught exception"
  );

  void shutdown("uncaught-exception");
});

void bootstrap();
