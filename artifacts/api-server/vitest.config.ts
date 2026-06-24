import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Credit tests share a single Postgres database and use unique per-test
    // user ids, but transactions with SELECT ... FOR UPDATE can deadlock if run
    // concurrently against the same rows. Run serially for determinism.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
