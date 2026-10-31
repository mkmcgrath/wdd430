import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: { DATABASE_PATH: ":memory:", NODE_ENV: "test" },
  },
});
