import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Shared-package tests run here too, so the repo needs only one Vitest install.
    include: ["src/**/*.test.ts", "../packages/shared/src/**/*.test.ts", "../web/src/i18n/**/*.test.ts", "../web/src/lib/**/*.test.ts"],
    environment: "node",
    // API integration tests start an in-memory Postgres and apply migrations.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
