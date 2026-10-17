import { describe, expect, it, vi } from "vitest";
import { GET as me, PUT as updateMe } from "@/app/api/auth/me/route";
import { PUT as changePassword } from "@/app/api/auth/me/password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { call, createUser } from "./helpers/api";

vi.spyOn(console, "info").mockImplementation(() => {});

describe("F4 profile", () => {
  it("F4_AC1_UpdateName_Returns200AndPersists", async () => {
    const { token, user } = await createUser({ name: "Ana", email: "ana@example.com" });
    const res = await call(updateMe, "PUT", "/api/auth/me", {
      token,
      body: { name: "Ana Lopez", email: "ana@example.com" },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, name: "Ana Lopez" });
    expect((await call(me, "GET", "/api/auth/me", { token })).body.name).toBe("Ana Lopez");
  });

  it("F4_AC2_EmailOfAnotherAccount_Returns409", async () => {
    await createUser({ email: "ben@example.com" });
    const { token } = await createUser({ name: "Ana", email: "ana@example.com" });
    const res = await call(updateMe, "PUT", "/api/auth/me", {
      token,
      body: { name: "Ana", email: "Ben@Example.com" },
    });
    expect(res.status).toBe(409);
    expect((await call(me, "GET", "/api/auth/me", { token })).body.email).toBe("ana@example.com");
  });

  it("F4_AC3_OwnEmailDifferentCase_Returns200Normalized", async () => {
    const { token } = await createUser({ name: "Ana", email: "ana@example.com" });
    const res = await call(updateMe, "PUT", "/api/auth/me", {
      token,
      body: { name: "Ana", email: "ANA@example.com" },
    });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ana@example.com");
  });

  it("F4_AC4_ChangedEmail_NewWorksOldFails", async () => {
    const { token } = await createUser({ name: "Ana", email: "ana@example.com" });
    await call(updateMe, "PUT", "/api/auth/me", { token, body: { name: "Ana", email: "ana.l@example.com" } });
    const ok = await call(login, "POST", "/api/auth/login", {
      body: { email: "ana.l@example.com", password: "password123" },
    });
    const old = await call(login, "POST", "/api/auth/login", {
      body: { email: "ana@example.com", password: "password123" },
    });
    expect(ok.status).toBe(200);
    expect(old.status).toBe(401);
  });

  it("F4_AC5_ValidPasswordChange_Returns204AndSwapsPassword", async () => {
    const { token } = await createUser({ email: "ana@example.com" });
    const res = await call(changePassword, "PUT", "/api/auth/me/password", {
      token,
      body: { currentPassword: "password123", newPassword: "new-password-456" },
    });
    expect(res.status).toBe(204);
    const withNew = await call(login, "POST", "/api/auth/login", {
      body: { email: "ana@example.com", password: "new-password-456" },
    });
    const withOld = await call(login, "POST", "/api/auth/login", {
      body: { email: "ana@example.com", password: "password123" },
    });
    expect(withNew.status).toBe(200);
    expect(withOld.status).toBe(401);
  });

  it("F4_AC6_WrongCurrentPassword_Returns400Not401", async () => {
    const { token } = await createUser();
    const res = await call(changePassword, "PUT", "/api/auth/me/password", {
      token,
      body: { currentPassword: "not-my-password", newPassword: "new-password-456" },
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.currentPassword).toBeDefined();
  });

  it("F4_AC7_ShortOrUnchangedNewPassword_Returns400UnderNewPassword", async () => {
    const { token } = await createUser();
    for (const newPassword of ["1234567", "password123"]) {
      const res = await call(changePassword, "PUT", "/api/auth/me/password", {
        token,
        body: { currentPassword: "password123", newPassword },
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.newPassword).toBeDefined();
    }
  });

  it("F4_AC8_NoToken_Returns401", async () => {
    expect((await call(updateMe, "PUT", "/api/auth/me", { body: { name: "x", email: "x@example.com" } })).status).toBe(401);
    expect(
      (await call(changePassword, "PUT", "/api/auth/me/password", { body: { currentPassword: "a", newPassword: "b" } }))
        .status,
    ).toBe(401);
  });
});
