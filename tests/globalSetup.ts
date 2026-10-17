import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Fresh throwaway database for every test run (F1 FR-8).
export default function setup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`prisma/test.db${suffix}`, { force: true });
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
  });
}
