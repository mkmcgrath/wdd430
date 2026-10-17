import { beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { loginLimiter } from "@/lib/auth/rateLimit";

// Every test starts with an empty database. Deleting users cascades to
// notes, links, tags and join rows.
beforeEach(async () => {
  await prisma.user.deleteMany();
  loginLimiter.reset();
});
