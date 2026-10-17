import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the Next.js server bundle; tests run in plain Node.
      "server-only": fileURLToPath(new URL("./tests/helpers/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // All test files share one SQLite file, so run them one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: "file:./prisma/test.db",
      JWT_SECRET: "test-only-secret-that-is-at-least-32-characters-long",
      JWT_LIFETIME_MINUTES: "480",
    },
  },
});
