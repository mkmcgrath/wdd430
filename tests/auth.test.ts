import { beforeEach, describe, expect, it } from "vitest";
import { one, run } from "../server/db";
import { safeReturnUrl } from "../src/lib/returnUrl";
import { client, cookieFrom, json, PASSWORD, resetLimits, signedIn, uniqueEmail } from "./helpers";

beforeEach(resetLimits);

describe("registration", () => {
  it("creates an account without returning the hash", async () => {
    const response = await client().post("/auth/register", { name: " Ada ", email: uniqueEmail(), password: PASSWORD });
    expect(response.status).toBe(201);
    const body = await json(response);
    expect(body.name).toBe("Ada");
    expect(JSON.stringify(body)).not.toContain("scrypt");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("rejects a duplicate email in any case with 409", async () => {
    const email = uniqueEmail();
    await client().post("/auth/register", { name: "A", email, password: PASSWORD });
    const response = await client().post("/auth/register", { name: "B", email: email.toUpperCase(), password: PASSWORD });
    expect(response.status).toBe(409);
    expect((await json(response)).errors.email).toBeDefined();
  });

  it.each([
    ["short password", { name: "A", email: "a@example.com", password: "short" }, "password"],
    ["invalid email", { name: "A", email: "nope", password: PASSWORD }, "email"],
    ["blank name", { name: "  ", email: "a@example.com", password: PASSWORD }, "name"],
  ])("returns 400 under the field for %s", async (_label, body, field) => {
    const response = await client().post("/auth/register", body);
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect((await json(response)).errors[field]).toBeDefined();
  });

  it("stores a salted scrypt hash", async () => {
    const email = uniqueEmail();
    await client().post("/auth/register", { name: "A", email, password: PASSWORD });
    const row = one<{ password_hash: string }>("SELECT password_hash FROM users WHERE email = ?", email)!;
    expect(row.password_hash).toMatch(/^scrypt\$/);
    expect(row.password_hash).not.toContain(PASSWORD);
  });

  it("allows only one of two simultaneous registrations", async () => {
    const email = uniqueEmail();
    const body = { name: "A", email, password: PASSWORD };
    const statuses = (await Promise.all([client().post("/auth/register", body), client().post("/auth/register", body)]))
      .map((response) => response.status)
      .sort();
    expect(statuses).toEqual([201, 409]);
  });
});

describe("login and sessions", () => {
  it("signs in and sets a protected cookie", async () => {
    const email = uniqueEmail();
    await client().post("/auth/register", { name: "A", email, password: PASSWORD });
    const response = await client().post("/auth/login", { email, password: PASSWORD });
    expect(response.status).toBe(200);
    expect((await json(response)).user.email).toBe(email);

    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/vault");
  });

  it("accepts email in any case with extra spaces", async () => {
    const email = uniqueEmail();
    await client().post("/auth/register", { name: "A", email, password: PASSWORD });
    const response = await client().post("/auth/login", { email: `  ${email.toUpperCase()} `, password: PASSWORD });
    expect(response.status).toBe(200);
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    const email = uniqueEmail();
    await client().post("/auth/register", { name: "A", email, password: PASSWORD });
    const wrong = await client().post("/auth/login", { email, password: "wrong password" });
    const unknown = await client().post("/auth/login", { email: uniqueEmail(), password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await json(wrong)).toEqual(await json(unknown));
  });

  it("returns the current user for a valid session", async () => {
    const { api, email } = await signedIn();
    const response = await api.get("/auth/me");
    expect(response.status).toBe(200);
    expect((await json(response)).email).toBe(email);
  });

  it("separates a missing session from a bad one", async () => {
    const missing = await client().get("/auth/me");
    expect(missing.status).toBe(401);
    expect((await json(missing)).code).toBe("unauthenticated");

    const tampered = await client("vault_session=not-a-real-token").get("/auth/me");
    expect(tampered.status).toBe(401);
    expect((await json(tampered)).code).toBe("session_expired");
  });

  it("rejects an expired session", async () => {
    const { api, userId } = await signedIn();
    run("UPDATE sessions SET expires_at = ? WHERE user_id = ?", new Date(Date.now() - 1000).toISOString(), userId);
    expect((await api.get("/auth/me")).status).toBe(401);
  });

  it("rejects the session of a deleted user", async () => {
    const { api, userId } = await signedIn();
    run("DELETE FROM users WHERE id = ?", userId);
    expect((await api.get("/auth/me")).status).toBe(401);
  });

  it("really ends the session on sign out", async () => {
    const { api } = await signedIn();
    const copied = api.cookie;
    expect((await api.post("/auth/logout")).status).toBe(204);
    expect((await client(copied).get("/auth/me")).status).toBe(401);
  });

  it("reports the session state without an error status", async () => {
    expect(await json(await client().get("/auth/session"))).toEqual({ user: null });
    const { api, email } = await signedIn();
    expect((await json(await api.get("/auth/session"))).user.email).toBe(email);
  });

  it("limits sign-in to five attempts a minute", async () => {
    const attempt = () => client().post("/auth/login", { email: "a@example.com", password: "whatever1" });
    for (let i = 0; i < 5; i += 1) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });

  it.each(["/auth/me", "/notes", "/links", "/tags", "/dashboard"])("protects %s", async (path) => {
    expect((await client().get(path)).status).toBe(401);
  });

  it("only allows local return URLs", () => {
    const base = "/vault/";
    expect(safeReturnUrl("/vault/notes/?tag=2", base)).toBe("/vault/notes/?tag=2");
    expect(safeReturnUrl("https://evil.example/", base)).toBeUndefined();
    expect(safeReturnUrl("//evil.example/", base)).toBeUndefined();
    expect(safeReturnUrl("/vault//evil.example", base)).toBeUndefined();
    expect(safeReturnUrl("/vault/\\evil.example", base)).toBeUndefined();
    expect(safeReturnUrl("/game/", base)).toBeUndefined();
    expect(safeReturnUrl(null, base)).toBeUndefined();
  });
});

describe("request handling", () => {
  it("answers the health check", async () => {
    const response = await client().get("/health");
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ status: "ok" });
  });

  it("marks responses as uncacheable", async () => {
    const { api } = await signedIn();
    expect((await api.get("/notes")).headers.get("cache-control")).toBe("no-store");
  });

  it("requires JSON request bodies", async () => {
    const { api } = await signedIn();
    const response = await api.request("POST", "/notes", undefined, { "content-type": "text/plain" });
    expect(response.status).toBe(415);
  });

  it("rejects malformed JSON", async () => {
    const { app, API_BASE } = await import("../server/app");
    const response = await app.request(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{oops",
    });
    expect(response.status).toBe(400);
  });

  it("rejects oversized bodies", async () => {
    const { api } = await signedIn();
    const response = await api.post("/notes", { title: "big", content: "x".repeat(200_000) });
    expect(response.status).toBe(413);
  });

  it("returns problem JSON with no stack trace for unexpected errors", async () => {
    const { handleError } = await import("../server/app");
    const { Hono } = await import("hono");
    const crashing = new Hono();
    crashing.onError(handleError);
    crashing.get("/boom", () => {
      throw new Error("secret detail");
    });
    const response = await crashing.request("/boom");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret detail");
  });
});

describe("profile", () => {
  it("updates the name", async () => {
    const { api, email } = await signedIn();
    const response = await api.put("/auth/me", { name: "New Name", email });
    expect(response.status).toBe(200);
    expect((await json(await api.get("/auth/me"))).name).toBe("New Name");
  });

  it("rejects another account's email with 409", async () => {
    const other = await signedIn();
    const { api } = await signedIn();
    expect((await api.put("/auth/me", { name: "A", email: other.email })).status).toBe(409);
  });

  it("allows your own email in a different case", async () => {
    const { api, email } = await signedIn();
    const response = await api.put("/auth/me", { name: "A", email: email.toUpperCase() });
    expect(response.status).toBe(200);
    expect((await json(response)).email).toBe(email);
  });

  it("signs in with a changed email, not the old one", async () => {
    const { api, email } = await signedIn();
    const newEmail = uniqueEmail();
    await api.put("/auth/me", { name: "A", email: newEmail });
    expect((await client().post("/auth/login", { email: newEmail, password: PASSWORD })).status).toBe(200);
    expect((await client().post("/auth/login", { email, password: PASSWORD })).status).toBe(401);
  });

  it("changes the password and ends other sessions", async () => {
    const { api, email } = await signedIn();
    const second = client(cookieFrom(await client().post("/auth/login", { email, password: PASSWORD })));

    const response = await api.put("/auth/me/password", { currentPassword: PASSWORD, newPassword: "a new password" });
    expect(response.status).toBe(204);

    expect((await api.get("/auth/me")).status).toBe(200);
    expect((await second.get("/auth/me")).status).toBe(401);
    expect((await client().post("/auth/login", { email, password: PASSWORD })).status).toBe(401);
    expect((await client().post("/auth/login", { email, password: "a new password" })).status).toBe(200);
  });

  it("returns 400, not 401, for a wrong current password", async () => {
    const { api } = await signedIn();
    const response = await api.put("/auth/me/password", { currentPassword: "wrong one", newPassword: "a new password" });
    expect(response.status).toBe(400);
    expect((await json(response)).errors.currentPassword).toBeDefined();
  });

  it("rejects a short or unchanged new password", async () => {
    const { api } = await signedIn();
    for (const newPassword of ["short", PASSWORD]) {
      const response = await api.put("/auth/me/password", { currentPassword: PASSWORD, newPassword });
      expect(response.status).toBe(400);
      expect((await json(response)).errors.newPassword).toBeDefined();
    }
  });
});
