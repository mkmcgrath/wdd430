import { describe, expect, it } from "vitest";
import { GET as list, POST as create } from "@/app/api/links/route";
import { DELETE as remove, GET as get, PUT as update } from "@/app/api/links/[id]/route";
import { prisma } from "@/lib/db";
import { call, createUser, sleep } from "./helpers/api";

const idParams = (id: number) => ({ params: { id: String(id) } });

describe("F6 links CRUD", () => {
  it("F6_AC1_CreateLink_Returns201WithLocation", async () => {
    const { token } = await createUser();
    const res = await call(create, "POST", "/api/links", {
      token,
      body: {
        url: "https://expressjs.com/en/guide/routing.html",
        title: "Express routing docs",
        description: "Route params section",
      },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      url: "https://expressjs.com/en/guide/routing.html",
      title: "Express routing docs",
      description: "Route params section",
    });
    expect(res.headers.get("location")).toBe(`/api/links/${res.body.id}`);
  });

  it("F6_AC2_NoTitle_DefaultsToUrl", async () => {
    const { token } = await createUser();
    const res = await call(create, "POST", "/api/links", { token, body: { url: "https://example.com/page" } });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("https://example.com/page");
    expect(res.body.description).toBeNull();
  });

  it("F6_AC3_UnsafeOrRelativeUrls_Return400UnderUrl", async () => {
    const { token } = await createUser();
    for (const url of ["javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "/relative/path", "example.com"]) {
      const res = await call(create, "POST", "/api/links", { token, body: { url } });
      expect(res.status, url).toBe(400);
      expect(res.body.errors.url, url).toBeDefined();
    }
  });

  it("F6_AC4_TooLongUrlOrDescription_Returns400", async () => {
    const { token } = await createUser();
    const longUrl = "https://example.com/" + "a".repeat(2049 - "https://example.com/".length);
    const urlRes = await call(create, "POST", "/api/links", { token, body: { url: longUrl } });
    expect(urlRes.status).toBe(400);
    expect(urlRes.body.errors.url).toBeDefined();

    const descRes = await call(create, "POST", "/api/links", {
      token,
      body: { url: "https://example.com", description: "d".repeat(1001) },
    });
    expect(descRes.status).toBe(400);
    expect(descRes.body.errors.description).toBeDefined();
  });

  it("F6_AC5_List_OnlyOwnLinksNewestUpdatedFirst", async () => {
    const a = await createUser();
    const b = await createUser();
    const at = (h: number) => new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00Z`);
    for (const h of [9, 11, 10]) {
      await prisma.link.create({ data: { userId: a.user.id, title: `${h}`, url: "https://x.dev", updatedAt: at(h) } });
    }
    await prisma.link.create({ data: { userId: b.user.id, title: "B", url: "https://b.dev" } });

    const res = await call(list, "GET", "/api/links", { token: a.token });
    expect(res.body.map((l: { title: string }) => l.title)).toEqual(["11", "10", "9"]);
  });

  it("F6_AC6_OtherUsersLink_GetPutDeleteReturn404", async () => {
    const a = await createUser();
    const b = await createUser();
    const link = await prisma.link.create({ data: { userId: b.user.id, title: "B", url: "https://b.dev" } });
    const opts = { token: a.token, ...idParams(link.id) };
    expect((await call(get, "GET", `/api/links/${link.id}`, opts)).status).toBe(404);
    expect((await call(update, "PUT", `/api/links/${link.id}`, { ...opts, body: { url: "https://evil.dev" } })).status).toBe(404);
    expect((await call(remove, "DELETE", `/api/links/${link.id}`, opts)).status).toBe(404);
    expect(await prisma.link.findUnique({ where: { id: link.id } })).toMatchObject({ url: "https://b.dev" });
  });

  it("F6_AC7_EditDescription_BumpsUpdatedAtKeepsCreatedAt", async () => {
    const { token } = await createUser();
    const created = await call(create, "POST", "/api/links", { token, body: { url: "https://a.dev", description: "old" } });
    await sleep(15);
    const res = await call(update, "PUT", `/api/links/${created.body.id}`, {
      token,
      ...idParams(created.body.id),
      body: { url: "https://a.dev", description: "new" },
    });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe("new");
    expect(res.body.createdAt).toBe(created.body.createdAt);
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(created.body.updatedAt).getTime());
  });

  it("F6_AC8_DeleteLink_Returns204ThenGet404", async () => {
    const { token } = await createUser();
    const created = await call(create, "POST", "/api/links", { token, body: { url: "https://a.dev" } });
    const opts = { token, ...idParams(created.body.id) };
    expect((await call(remove, "DELETE", `/api/links/${created.body.id}`, opts)).status).toBe(204);
    expect((await call(get, "GET", `/api/links/${created.body.id}`, opts)).status).toBe(404);
  });

  it("F6_AC9_DuplicateUrl_IsAllowed", async () => {
    const { token } = await createUser();
    const first = await call(create, "POST", "/api/links", { token, body: { url: "https://dup.dev" } });
    const second = await call(create, "POST", "/api/links", { token, body: { url: "https://dup.dev" } });
    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
  });

  it("F6_AC11_HtmlInDescription_ReturnedAsLiteralText", async () => {
    const { token } = await createUser();
    const description = "<img src=x onerror=alert(1)>";
    const res = await call(create, "POST", "/api/links", { token, body: { url: "https://a.dev", description } });
    expect(res.body.description).toBe(description);
  });
});
