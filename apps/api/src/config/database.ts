
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
  log:
    env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();

  // Verify that PostgreSQL responds to a query.
  await prisma.$queryRaw`SELECT 1`;

  console.log("PostgreSQL connected successfully");
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
