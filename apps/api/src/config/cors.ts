
import cors from "cors";
import { env } from "./env.js";

const allowedOrigins = env.CORS_ORIGINS;

export const corsMiddleware = cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.error("CORS blocked origin:", origin);
        console.error("Allowed origins:", allowedOrigins);

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
    ],

    optionsSuccessStatus: 204,
});
