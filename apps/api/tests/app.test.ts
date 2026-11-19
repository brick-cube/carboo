
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { disconnectDatabase } from "../src/config/database.js";

const API_PREFIX = "/api/v1";

describe("API foundation", () => {
    it("GET /health/live should return 200", async () => {
        const response = await request(app)
            .get(`${API_PREFIX}/health/live`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe("alive");
        expect(response.body.data).toHaveProperty("timestamp");
    });

    it("GET /health/ready should confirm database connectivity", async () => {
        const response = await request(app)
            .get(`${API_PREFIX}/health/ready`);

        expect(response.status).toBe(200);
    });

    it("should return 404 for an unknown route", async () => {
        const response = await request(app)
            .get(`${API_PREFIX}/this-route-does-not-exist`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty("code");
    });

    it("should reject malformed JSON", async () => {
        const response = await request(app)
            .post(`${API_PREFIX}/test-json`)
            .set("Content-Type", "application/json")
            .send('{"invalid":');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("INVALID_JSON");
    });

    it("should reject requests from disallowed origins", async () => {
        const response = await request(app)
            .get(`${API_PREFIX}/health/live`)
            .set("Origin", "https://malicious.example");

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    });

    it("should reject registration with invalid input", async () => {
        const response = await request(app)
            .post(`${API_PREFIX}/auth/register`)
            .send({
                name: "A",
                email: "invalid-email",
                password: "123",
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it("should reject customer login with invalid input", async () => {
        const response = await request(app)
            .post(`${API_PREFIX}/auth/login`)
            .send({
                email: "invalid-email",
                password: "",
            });

        expect(response.status).toBe(400);
    });

    it("should reject admin login with invalid input", async () => {
        const response = await request(app)
            .post(`${API_PREFIX}/auth/admin/login`)
            .send({});

        expect(response.status).toBe(400);
    });

    it("should reject access to the current user without authentication", async () => {
        const response = await request(app)
            .get(`${API_PREFIX}/auth/me`);

        expect(response.status).toBe(401);
    });

    it("should reject user profile access without authentication", async () => {
        const response = await request(app)
            .get(`${API_PREFIX}/users/me`);

        expect(response.status).toBe(401);
    });

    it("should reject admin user listing without authentication", async () => {
        const response = await request(app)
            .get(`${API_PREFIX}/users`);

        expect(response.status).toBe(401);
    });

    it("should reject refresh without CSRF protection", async () => {
        const response = await request(app)
            .post(`${API_PREFIX}/auth/refresh`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe("CSRF_VALIDATION_FAILED");
    });

    it("should reject logout without CSRF protection", async () => {
        const response = await request(app)
            .post(`${API_PREFIX}/auth/logout`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe("CSRF_VALIDATION_FAILED");
    });

    it("should enforce the global rate limit", async () => {
        let lastResponse;

        // The configured limit is 300 requests per 15 minutes.
        for (let i = 0; i < 301; i++) {
            lastResponse = await request(app)
                .get(`${API_PREFIX}/health/live`);
        }

        expect(lastResponse?.status).toBe(429);
        expect(lastResponse?.body.error.code).toBe("TOO_MANY_REQUESTS");
    });

});

afterAll(async () => {
    await disconnectDatabase();
});
