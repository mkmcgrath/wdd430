import { describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as listNotes } from "@/app/api/notes/route";
import { GET as dashboard } from "@/app/api/dashboard/route";
import { createToken, safeReturnUrl, verifyToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { requireApiUser, withErrors } from "@/lib/http";
import { call, createUser } from "./helpers/api";

vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

describe("F3 login & session", () => {
  it("F3_AC1_ValidLogin_Returns200WithTokenAndUser", async () => {
    const { user } = await createUser({ email: "ana@example.com" });
    const res = await call(login, "POST", "/api/auth/login", {
      body: { email: "ana@example.com", password: "password123" },
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ id: user.id, email: "ana@example.com" });
    const minutesAhead = (new Date(res.body.expiresAt).getTime() - Date.now()) / 60_000;
    expect(minutesAhead).toBeGreaterThan(478);
    expect(minutesAhead).toBeLessThanOrEqual(480);
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    expect(await verifyToken(res.body.token)).toBe(user.id);
  });

  it("F3_AC2_EmailCaseAndSpaces_LoginSucceeds", async () => {
    await createUser({ email: "ana@example.com" });
    const res = await call(login, "POST", "/api/auth/login", {
      body: { email: "ANA@example.com ", password: "password123" },
    });
    expect(res.status).toBe(200);
  });

  it("F3_AC3_AC4_WrongPasswordAndUnknownEmail_SameGeneric401", async () => {
    await createUser({ email: "ana@example.com" });
    const wrong = await call(login, "POST", "/api/auth/login", {
      body: { email: "ana@example.com", password: "nope-nope" },
    });
    const unknown = await call(login, "POST", "/api/auth/login", {
      body: { email: "nobody@example.com", password: "password123" },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.detail).toBe("Invalid email or password.");
    expect(unknown.body.detail).toBe(wrong.body.detail);
  });

  it("F3_AC5_ValidToken_MeReturnsUser", async () => {
    const { user, token } = await createUser();
    const res = await call(me, "GET", "/api/auth/me", { token });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, name: user.name, email: user.email });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("F3_AC6_MissingTamperedExpiredToken_Return401", async () => {
    const { user, token } = await createUser();
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(user.id))
      .setExpirationTime(Math.floor(Date.now() / 1000) - 120) // beyond the 60s clock tolerance
      .sign(secret);
    const algNone = `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(JSON.stringify({ sub: String(user.id) }))}.`;

    expect((await call(me, "GET", "/api/auth/me")).status).toBe(401);
    for (const bad of [tampered, expired, algNone, "garbage"]) {
      expect((await call(me, "GET", "/api/auth/me", { token: bad })).status).toBe(401);
    }
  });

  it("F3_AC6b_SessionCookie_IsAcceptedLikeBearer", async () => {
    const { token } = await createUser();
    const res = await call(me, "GET", "/api/auth/me", { headers: { cookie: `vault_session=${token}` } });
    expect(res.status).toBe(200);
  });

  it("F3_AC7_DeletedUsersToken_Returns401", async () => {
    const { user, token } = await createUser();
    await prisma.user.delete({ where: { id: user.id } });
    expect((await call(me, "GET", "/api/auth/me", { token })).status).toBe(401);
  });

  it("F3_AC9_ReturnUrl_OnlyLocalPathsAllowed", () => {
    expect(safeReturnUrl("/notes")).toBe("/notes");
    expect(safeReturnUrl("/notes?tag=2")).toBe("/notes?tag=2");
    expect(safeReturnUrl("https://evil.example")).toBe("/dashboard");
    expect(safeReturnUrl("//evil.example")).toBe("/dashboard");
    expect(safeReturnUrl("/\\evil.example")).toBe("/dashboard");
    expect(safeReturnUrl(null)).toBe("/dashboard");
  });

  it("F3_AC12_SixthLoginInAMinute_Returns429", async () => {
    await createUser({ email: "ana@example.com" });
    const headers = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 5; i++) {
      const res = await call(login, "POST", "/api/auth/login", {
        body: { email: "ana@example.com", password: "wrong-password" },
        headers,
      });
      expect(res.status).toBe(401);
    }
    const sixth = await call(login, "POST", "/api/auth/login", {
      body: { email: "ana@example.com", password: "password123" },
      headers,
    });
    expect(sixth.status).toBe(429);
  });

  it("F3_AC13_ProtectedEndpoints_Return401WithoutToken", async () => {
    const testOnlyRoute = withErrors(async (request) => Response.json(await requireApiUser(request)));
    expect((await call(testOnlyRoute, "GET", "/api/test-only")).status).toBe(401);
    expect((await call(listNotes, "GET", "/api/notes")).status).toBe(401);
    expect((await call(dashboard, "GET", "/api/dashboard")).status).toBe(401);
  });

  it("F3_Unit_TokenCarriesClaimsAndExpiry", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const { expiresAt } = await createToken({ id: 7, name: "Ana", email: "a@example.com" }, now);
    expect(expiresAt.toISOString()).toBe("2026-01-01T08:00:00.000Z");
  });
});
