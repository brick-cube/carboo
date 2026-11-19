
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";

import request from "supertest";
import { randomUUID } from "node:crypto";

import app from "../src/app.js";
import { prisma, disconnectDatabase } from "../src/config/database.js";
import { verifyPassword } from "../src/common/utils/password.js";
import { hashRefreshToken } from "../src/common/utils/token.js";

const API_PREFIX = "/api/v1";

const email = `integration-${randomUUID()}@example.test`;
const password = "Carboo-Test-Password-2026!";

const createdEmails = [email];


function getCookie(
    response: request.Response,
    name: string
): string {
    const rawCookies = response.headers["set-cookie"];

    const cookies = Array.isArray(rawCookies)
        ? rawCookies
        : rawCookies
            ? [rawCookies]
            : [];

    const cookie = cookies.find((value) =>
        value.startsWith(`${name}=`)
    );

    if (!cookie) {
        throw new Error(`${name} cookie was not returned`);
    }

    return cookie.split(";")[0]!.slice(name.length + 1);
}

async function loginCustomer() {
    const agent = request.agent(app);

    const response = await agent
        .post(`${API_PREFIX}/auth/login`)
        .send({ email, password });

    expect(response.status).toBe(200);

    return { agent, response };
}

beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("carboo_test")) {
        throw new Error(
            "Refusing to run authentication integration tests without carboo_test database"
        );
    }

    await prisma.$connect();
});

afterAll(async () => {
    await prisma.user.deleteMany({
        where: {
            email: { in: createdEmails },
        },
    });

    await disconnectDatabase();
});

describe("Authentication integration", () => {
    it("should register a customer with a hashed password", async () => {
        const agent = request.agent(app);

        const response = await agent
            .post(`${API_PREFIX}/auth/register`)
            .send({
                name: "Integration Customer",
                email,
                password,
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(email);
        expect(response.body.data.user.role).toBe("CUSTOMER");

        // Password hash must never be returned by the API.
        expect(response.body.data.user.passwordHash).toBeUndefined();

        expect(response.body.data.accessToken).toBeTruthy();
        expect(response.body.data.csrfToken).toBeTruthy();

        const user = await prisma.user.findUnique({
            where: { email },
        });

        expect(user).not.toBeNull();
        expect(user?.passwordHash).toBeTruthy();
        expect(user?.passwordHash).not.toBe(password);

        expect(
            await verifyPassword(user!.passwordHash!, password)
        ).toBe(true);

        const refreshToken = getCookie(response, "carboo_refresh");

        const session = await prisma.authSession.findUnique({
            where: {
                tokenHash: hashRefreshToken(refreshToken),
            },
        });

        expect(session).not.toBeNull();
        expect(session?.revokedAt).toBeNull();
    });

    it("should reject duplicate email registration", async () => {
        const response = await request(app)
            .post(`${API_PREFIX}/auth/register`)
            .send({
                name: "Duplicate Customer",
                email,
                password,
            });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
    });

    it("should authenticate customers and reject invalid credentials", async () => {
        const correctLogin = await request(app)
            .post(`${API_PREFIX}/auth/login`)
            .send({ email, password });

        expect(correctLogin.status).toBe(200);
        expect(correctLogin.body.data.accessToken).toBeTruthy();

        const incorrectLogin = await request(app)
            .post(`${API_PREFIX}/auth/login`)
            .send({
                email,
                password: "Wrong-Password-123!",
            });

        expect(incorrectLogin.status).toBe(401);

        // A customer account must not authenticate as an admin.
        const adminLogin = await request(app)
            .post(`${API_PREFIX}/auth/admin/login`)
            .send({ email, password });

        expect(adminLogin.status).toBe(401);
    });

    it("should rotate refresh tokens and detect token reuse", async () => {
        const { agent, response: loginResponse } =
            await loginCustomer();

        const oldRefreshToken = getCookie(
            loginResponse,
            "carboo_refresh"
        );

        const oldCsrfToken = loginResponse.body.data.csrfToken;

        const oldAccessToken = loginResponse.body.data.accessToken;

        const refreshResponse = await agent
            .post(`${API_PREFIX}/auth/refresh`)
            .set("X-CSRF-Token", oldCsrfToken);

        expect(refreshResponse.status).toBe(200);

        const newRefreshToken = getCookie(
            refreshResponse,
            "carboo_refresh"
        );

        expect(newRefreshToken).not.toBe(oldRefreshToken);

        const oldSession = await prisma.authSession.findUnique({
            where: {
                tokenHash: hashRefreshToken(oldRefreshToken),
            },
        });

        expect(oldSession?.revokedAt).not.toBeNull();
        expect(oldSession?.rotationCompletedAt).not.toBeNull();

        // Simulate token replay outside the 5-second concurrency grace period.
        await prisma.authSession.update({
            where: {
                tokenHash: hashRefreshToken(oldRefreshToken),
            },
            data: {
                rotationCompletedAt: new Date(Date.now() - 10_000),
            },
        });

        // Simulate an attacker replaying the previous refresh token.
        const replayResponse = await request(app)
            .post(`${API_PREFIX}/auth/refresh`)
            .set(
                "Cookie",
                `carboo_refresh=${oldRefreshToken}; carboo_csrf=${oldCsrfToken}`
            )
            .set("X-CSRF-Token", oldCsrfToken);

        expect(replayResponse.status).toBe(401);
        expect(replayResponse.body.error.code).toBe(
            "REFRESH_TOKEN_REUSE"
        );

        // Reuse detection should revoke the replacement session too.
        const newSession = await prisma.authSession.findUnique({
            where: {
                tokenHash: hashRefreshToken(newRefreshToken),
            },
        });

        expect(newSession?.revokedAt).not.toBeNull();

        const protectedResponse = await request(app)
            .get(`${API_PREFIX}/auth/me`)
            .set("Authorization", `Bearer ${oldAccessToken}`);

        expect(protectedResponse.status).toBe(401);
    });

    it("should revoke the current session on logout", async () => {
        const { agent, response: loginResponse } =
            await loginCustomer();

        const accessToken = loginResponse.body.data.accessToken;
        const csrfToken = loginResponse.body.data.csrfToken;

        const refreshToken = getCookie(
            loginResponse,
            "carboo_refresh"
        );

        const logoutResponse = await agent
            .post(`${API_PREFIX}/auth/logout`)
            .set("X-CSRF-Token", csrfToken);

        expect(logoutResponse.status).toBe(200);

        const session = await prisma.authSession.findUnique({
            where: {
                tokenHash: hashRefreshToken(refreshToken),
            },
        });

        expect(session?.revokedAt).not.toBeNull();

        // The access token must also stop working.
        const meResponse = await request(app)
            .get(`${API_PREFIX}/auth/me`)
            .set("Authorization", `Bearer ${accessToken}`);

        expect(meResponse.status).toBe(401);
    });
});
