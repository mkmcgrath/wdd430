import { describe, expect, it } from "vitest";
import { GET as list, POST as create } from "@/app/api/notes/route";
import { DELETE as remove, GET as get, PUT as update } from "@/app/api/notes/[id]/route";
import { prisma } from "@/lib/db";
import { call, createUser, sleep } from "./helpers/api";

const idParams = (id: number) => ({ params: { id: String(id) } });

describe("F5 notes CRUD", () => {
  it("F5_AC1_CreateNote_Returns201WithLocation", async () => {
    const { token } = await createUser();
    const res = await call(create, "POST", "/api/notes", {
      token,
      body: { title: "Lecture 3", content: "Line one\nLine two" },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Lecture 3", content: "Line one\nLine two", tags: [] });
    expect(res.body.createdAt).toBe(res.body.updatedAt);
    expect(res.headers.get("location")).toBe(`/api/notes/${res.body.id}`);
  });

  it("F5_AC2_BlankOrLongTitle_Returns400UnderTitle", async () => {
    const { token } = await createUser();
    for (const title of ["   ", "x".repeat(201)]) {
      const res = await call(create, "POST", "/api/notes", { token, body: { title, content: "" } });
      expect(res.status).toBe(400);
      expect(res.body.errors.title).toBeDefined();
    }
  });

  it("F5_AC3_ContentOver20000_Returns400UnderContent", async () => {
    const { token } = await createUser();
    const res = await call(create, "POST", "/api/notes", {
      token,
      body: { title: "Big", content: "x".repeat(20_001) },
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.content).toBeDefined();
  });

  it("F5_AC4_List_OnlyOwnNotesNewestUpdatedFirstWithPreview", async () => {
    const a = await createUser();
    const b = await createUser();
    const base = { userId: a.user.id };
    await prisma.note.create({ data: { ...base, title: "09:00", updatedAt: new Date("2026-01-01T09:00:00Z") } });
    await prisma.note.create({
      data: { ...base, title: "11:00", content: "line\n".repeat(100), updatedAt: new Date("2026-01-01T11:00:00Z") },
    });
    await prisma.note.create({ data: { ...base, title: "10:00", updatedAt: new Date("2026-01-01T10:00:00Z") } });
    await prisma.note.create({ data: { userId: b.user.id, title: "B's note" } });

    const res = await call(list, "GET", "/api/notes", { token: a.token });
    expect(res.status).toBe(200);
    expect(res.body.map((n: { title: string }) => n.title)).toEqual(["11:00", "10:00", "09:00"]);
    expect(res.body[0].contentPreview.length).toBeLessThanOrEqual(200);
    expect(res.body[0].contentPreview).not.toContain("\n");
    expect(res.body[0].content).toBeUndefined();
  });

  it("F5_AC5_OtherUsersNote_GetPutDeleteReturn404", async () => {
    const a = await createUser();
    const b = await createUser();
    const note = await prisma.note.create({ data: { userId: b.user.id, title: "B secret", content: "keep" } });

    const opts = { token: a.token, ...idParams(note.id) };
    expect((await call(get, "GET", `/api/notes/${note.id}`, opts)).status).toBe(404);
    expect(
      (await call(update, "PUT", `/api/notes/${note.id}`, { ...opts, body: { title: "hacked", content: "" } })).status,
    ).toBe(404);
    expect((await call(remove, "DELETE", `/api/notes/${note.id}`, opts)).status).toBe(404);
    expect(await prisma.note.findUnique({ where: { id: note.id } })).toMatchObject({ title: "B secret" });
  });

  it("F5_AC6_UpdateNote_BumpsUpdatedAtKeepsCreatedAt", async () => {
    const { token } = await createUser();
    const created = await call(create, "POST", "/api/notes", { token, body: { title: "Old", content: "c" } });
    await sleep(15);
    const res = await call(update, "PUT", `/api/notes/${created.body.id}`, {
      token,
      ...idParams(created.body.id),
      body: { title: "New", content: "c" },
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("New");
    expect(res.body.createdAt).toBe(created.body.createdAt);
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(created.body.updatedAt).getTime());
  });

  it("F5_AC7_ClientSuppliedOwnerAndDates_AreIgnored", async () => {
    const a = await createUser();
    const b = await createUser();
    const res = await call(create, "POST", "/api/notes", {
      token: a.token,
      body: { title: "Mine", content: "", userId: b.user.id, createdAt: "2020-01-01T00:00:00Z", id: 999 },
    });
    expect(res.status).toBe(201);
    const stored = await prisma.note.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.userId).toBe(a.user.id);
    expect(stored.createdAt.getFullYear()).toBeGreaterThan(2020);
  });

  it("F5_AC8_DeleteNote_Returns204ThenGet404", async () => {
    const { token } = await createUser();
    const created = await call(create, "POST", "/api/notes", { token, body: { title: "Bye", content: "" } });
    const opts = { token, ...idParams(created.body.id) };
    expect((await call(remove, "DELETE", `/api/notes/${created.body.id}`, opts)).status).toBe(204);
    expect((await call(get, "GET", `/api/notes/${created.body.id}`, opts)).status).toBe(404);
  });

  it("F5_AC9_ScriptContent_StoredAndReturnedAsLiteralText", async () => {
    const { token } = await createUser();
    const content = "<script>alert(1)</script>";
    const created = await call(create, "POST", "/api/notes", { token, body: { title: "XSS", content } });
    const res = await call(get, "GET", `/api/notes/${created.body.id}`, { token, ...idParams(created.body.id) });
    expect(res.body.content).toBe(content);
  });

  it("F5_NonNumericId_Returns404", async () => {
    const { token } = await createUser();
    expect((await call(get, "GET", "/api/notes/abc", { token, params: { id: "abc" } })).status).toBe(404);
  });
});
