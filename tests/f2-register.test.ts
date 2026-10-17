import { describe, expect, it, vi } from "vitest";
import argon2 from "argon2";
import { POST as register } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/db";
import { call } from "./helpers/api";

vi.spyOn(console, "info").mockImplementation(() => {});

const ana = { name: "Ana", email: "ana@example.com", password: "password123" };

describe("F2 registration", () => {
  it("F2_AC1_ValidRegistration_Returns201WithoutHash", async () => {
    const res = await call(register, "POST", "/api/auth/register", { body: ana });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Ana", email: "ana@example.com" });
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.createdAt).toEqual(expect.any(String));
    expect(Object.keys(res.body).sort()).toEqual(["createdAt", "email", "id", "name"]);
  });

  it("F2_AC2_DuplicateEmailAnyCase_Returns409", async () => {
    await call(register, "POST", "/api/auth/register", { body: ana });
    const res = await call(register, "POST", "/api/auth/register", {
      body: { ...ana, email: "  Ana@Example.COM " },
    });
    expect(res.status).toBe(409);
    expect(res.body.detail).toBe("An account with this email already exists.");
    expect(await prisma.user.count()).toBe(1);
  });

  it("F2_AC3_ShortPassword_Returns400UnderPassword", async () => {
    const res = await call(register, "POST", "/api/auth/register", { body: { ...ana, password: "1234567" } });
    expect(res.status).toBe(400);
    expect(res.body.errors.password).toBeDefined();
  });

  it("F2_AC4_InvalidEmail_Returns400UnderEmail", async () => {
    const res = await call(register, "POST", "/api/auth/register", { body: { ...ana, email: "not-an-email" } });
    expect(res.status).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  it("F2_AC5_BlankName_Returns400UnderName", async () => {
    for (const name of ["", "   "]) {
      const res = await call(register, "POST", "/api/auth/register", { body: { ...ana, name } });
      expect(res.status).toBe(400);
      expect(res.body.errors.name).toBeDefined();
    }
  });

  it("F2_AC6_StoredHash_IsArgon2idAndVerifies", async () => {
    await call(register, "POST", "/api/auth/register", { body: ana });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ana.email } });
    expect(user.passwordHash).not.toBe("password123");
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(await argon2.verify(user.passwordHash, "password123")).toBe(true);
  });

  it("F2_AC7_SimultaneousRegistrations_One201One409", async () => {
    const results = await Promise.all([
      call(register, "POST", "/api/auth/register", { body: ana }),
      call(register, "POST", "/api/auth/register", { body: ana }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });
});
