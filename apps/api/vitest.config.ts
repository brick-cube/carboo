import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

dotenv.config({
  path: ".env.test",
  override: true,
});

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
