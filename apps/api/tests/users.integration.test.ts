
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
import {
  UserRole,
  UserStatus,
} from "../src/generated/prisma/client.js";

import { hashPassword } from "../src/common/utils/password.js";
import { hashRefreshToken } from "../src/common/utils/token.js";

const API_PREFIX = "/api/v1";

const customerPassword = "Carboo-Customer-Password-2026!";
const adminPassword = "Carboo-Admin-Password-2026!";
const changedPassword = "Carboo-New-Password-2026!";

const suffix = randomUUID();

const customerEmail = `customer-${suffix}@example.test`;
const secondCustomerEmail = `customer2-${suffix}@example.test`;
const adminEmail = `admin-${suffix}@example.test`;
const secondAdminEmail = `admin2-${suffix}@example.test`;

const createdEmails = [
  customerEmail,
  secondCustomerEmail,
  adminEmail,
  secondAdminEmail,
];

async function login(email: string, password: string) {
  const response = await request(app)
    .post(`${API_PREFIX}/auth/login`)
    .send({ email, password });

  expect(response.status).toBe(200);

  return response.body.data.accessToken as string;
}

async function adminLogin() {
  const response = await request(app)
    .post(`${API_PREFIX}/auth/admin/login`)
    .send({
      email: adminEmail,
      password: adminPassword,
    });

  expect(response.status).toBe(200);

  return response.body.data.accessToken as string;
}

function getCookie(response: request.Response, name: string): string {
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

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("carboo_test")) {
    throw new Error(
      "Refusing to run user integration tests without carboo_test database"
    );
  }

  await prisma.$connect();

  const customerHash = await hashPassword(customerPassword);
  const adminHash = await hashPassword(adminPassword);

  await prisma.user.createMany({
    data: [
      {
        name: "Test Customer",
        email: customerEmail,
        passwordHash: customerHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
      {
        name: "Second Test Customer",
        email: secondCustomerEmail,
        passwordHash: customerHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
      {
        name: "Test Administrator",
        email: adminEmail,
        passwordHash: adminHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      {
        name: "Second Test Administrator",
        email: secondAdminEmail,
        passwordHash: adminHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: { in: createdEmails },
    },
  });

  await disconnectDatabase();
});

describe("User management integration", () => {
  it("should prevent customers from accessing admin user listing", async () => {
    const accessToken = await login(
      secondCustomerEmail,
      customerPassword
    );

    const response = await request(app)
      .get(`${API_PREFIX}/users`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("should allow admins to block customers and revoke their sessions", async () => {
    const customerLogin = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({
        email: customerEmail,
        password: customerPassword,
      });

    expect(customerLogin.status).toBe(200);

    const customerAccessToken =
      customerLogin.body.data.accessToken as string;

    const refreshToken = getCookie(
      customerLogin,
      "carboo_refresh"
    );

    const adminAccessToken = await adminLogin();

    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: customerEmail },
    });

    const session = await prisma.authSession.findUniqueOrThrow({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
      },
    });

    const response = await request(app)
      .patch(`${API_PREFIX}/users/${customer.id}/status`)
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ status: "BLOCKED" });

    expect(response.status).toBe(200);
    expect(response.body.data.user.status).toBe("BLOCKED");

    const updatedSession = await prisma.authSession.findUnique({
      where: { id: session.id },
    });

    expect(updatedSession?.revokedAt).not.toBeNull();

    const protectedResponse = await request(app)
      .get(`${API_PREFIX}/auth/me`)
      .set(
        "Authorization",
        `Bearer ${customerAccessToken}`
      );

    expect(protectedResponse.status).toBe(401);
  });

  it("should prevent admins from modifying another admin account", async () => {
    const adminAccessToken = await adminLogin();

    const secondAdmin = await prisma.user.findUniqueOrThrow({
      where: { email: secondAdminEmail },
    });

    const response = await request(app)
      .patch(`${API_PREFIX}/users/${secondAdmin.id}/status`)
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ status: "BLOCKED" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ADMIN_ACCOUNT_PROTECTED");
  });

  it("should prevent customers from escalating their own role", async () => {
    const accessToken = await login(
      secondCustomerEmail,
      customerPassword
    );

    const response = await request(app)
      .patch(`${API_PREFIX}/users/me`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(400);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: secondCustomerEmail },
    });

    expect(user.role).toBe(UserRole.CUSTOMER);
  });

  it("should change password and revoke existing sessions", async () => {
    const accessToken = await login(
      secondCustomerEmail,
      customerPassword
    );

    const response = await request(app)
      .patch(`${API_PREFIX}/users/me/password`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: customerPassword,
        newPassword: changedPassword,
      });

    expect(response.status).toBe(200);

    // Existing access token must no longer work.
    const meResponse = await request(app)
      .get(`${API_PREFIX}/auth/me`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(401);

    // Old password must fail.
    const oldLogin = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({
        email: secondCustomerEmail,
        password: customerPassword,
      });

    expect(oldLogin.status).toBe(401);

    // New password must work.
    const newLogin = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({
        email: secondCustomerEmail,
        password: changedPassword,
      });

    expect(newLogin.status).toBe(200);
  });
});
