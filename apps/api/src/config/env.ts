import dotenv from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV;

if (nodeEnv === "test") {
    dotenv.config({
        path: resolve(process.cwd(), ".env.test"),
        override: true,
    });
} else if (nodeEnv !== "production") {
    dotenv.config({
        path: resolve(process.cwd(), ".env"),
        override: true,
    });
}

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce.number().int().min(1).max(65535).default(5000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    API_PREFIX: z.string().default("/api/v1"),

    CORS_ORIGINS: z.string().default("http://localhost:3000"),

    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),

    TRUST_PROXY: z
        .enum(["true", "false"])
        .default("false"),

    AUTH_JWT_SECRET: z.string().min(32),
    AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment configuration:");

    console.error(
        z.prettifyError(parsed.error)
    );

    process.exit(1);
}

export const env = {
    ...parsed.data,

    CORS_ORIGINS: parsed.data.CORS_ORIGINS
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),

    TRUST_PROXY: parsed.data.TRUST_PROXY === "true",
};

export type Environment = typeof env;
