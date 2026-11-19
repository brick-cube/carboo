
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { corsMiddleware } from "./config/cors.js";

import { requestLogger } from "./common/middleware/request-logger.js";
import { notFoundHandler } from "./common/middleware/not-found.js";
import { errorHandler } from "./common/errors/error-handler.js";

import cookieParser from "cookie-parser";

import healthRoutes from "./modules/health/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import seatConfigurationsRoutes from "./modules/seat-configurations/seat-configurations.routes.js";
import vehiclesRoutes from "./modules/vehicles/vehicles.routes.js";
import routesRoutes from "./modules/routes/routes.routes.js";
import tripsRoutes from "./modules/trips/trips.routes.js";
import tripTemplatesRoutes from "./modules/trips/trip-templates.routes.js";

const app = express();

// Only trust one reverse proxy hop when explicitly configured.
// Do not enable this unless your deployment has a trusted proxy.
if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(corsMiddleware);

// Request logging
app.use(requestLogger);

// Security headers
app.use(helmet());

// CORS

// General API rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    },
  },
});

app.use(cookieParser());


app.use(env.API_PREFIX, globalLimiter);

// Request body parsing
app.use(
    express.json({
        limit: "1mb",
        strict: true,
    })
);

app.use(
    express.urlencoded({
        extended: false,
        limit: "1mb",
    })
);

// Health routes
app.use(env.API_PREFIX, healthRoutes);

// Authentication routes
app.use(`${env.API_PREFIX}/auth`, authRoutes);

// User routes
app.use(`${env.API_PREFIX}/users`, usersRoutes);

// Seat configurations routes
app.use(`${env.API_PREFIX}/seat-configurations`, seatConfigurationsRoutes);

// Vehicles routes
app.use(`${env.API_PREFIX}/vehicles`, vehiclesRoutes);

// Routes routes
app.use(`${env.API_PREFIX}/routes`, routesRoutes);

// Trips routes
app.use(`${env.API_PREFIX}/trips`, tripsRoutes);

// Trip templates routes
app.use(`${env.API_PREFIX}/trip-templates`, tripTemplatesRoutes);

// 404 handler
app.use(notFoundHandler);

// Central error handler - must be last
app.use(errorHandler);

console.log(env.PORT)

export default app;
