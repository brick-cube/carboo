
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { prisma } from "../config/database.js";
import { UserRole, UserStatus } from "../generated/prisma/client.js";
import { hashPassword } from "../common/utils/password.js";

async function main() {
  const name = process.env.ADMIN_NAME?.trim();  
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!name || !email || !email.includes("@")) {
    throw new Error(
      "Set valid ADMIN_NAME and ADMIN_EMAIL environment variables."
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new Error(
      "An account with this email already exists. No changes were made."
    );
  }

  // Generate a strong one-time password.
  // const temporaryPassword = randomBytes(36).toString("base64url");
  const temporaryPassword = "Melb123";
  const passwordHash = await hashPassword(temporaryPassword);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  console.log("\nAdmin account created successfully.\n");
  console.log(admin);
  console.log("\nTemporary password (shown once):");
  console.log(temporaryPassword);
  console.log("\nStore this password securely. Do not commit it or share it.");
}

main()
  .catch((error) => {
    console.error("Admin provisioning failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
