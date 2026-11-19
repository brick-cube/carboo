
import { createHash, randomBytes } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { env } from "../../config/env.js";

const JWT_ISSUER = "carboo-api";
const JWT_AUDIENCE = "carboo-client";

export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken(
  userId: string,
  sessionId: string
): string {
  return jwt.sign(
    { sid: sessionId },
    env.AUTH_JWT_SECRET,
    {
      subject: userId,
      expiresIn: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithm: "HS256",
    }
  );
}

export function verifyAccessToken(token: string): {
  userId: string;
  sessionId: string;
} {
  const payload = jwt.verify(token, env.AUTH_JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    userId: payload.sub,
    sessionId: payload.sid,
  };
}
