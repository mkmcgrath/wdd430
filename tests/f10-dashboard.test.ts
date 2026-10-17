import { describe, expect, it } from "vitest";
import { GET as dashboard } from "@/app/api/dashboard/route";
import { prisma } from "@/lib/db";
import { call, createUser } from "./helpers/api";

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 12, minute));

describe("F10 dashboard", () => {
  it("F10_AC1_AC2_RecentNotes_FiveNewestByCreatedAt", async () => {
    const { user, token } = await createUser();
    for (let i = 0; i < 7; i++) {
      await prisma.note.create({ data: { userId: user.id, title: `n${i}`, createdAt: at(i), updatedAt: at(i) } });
    }
    // Editing an old note must not move it into "recent" (AC-2).
    await prisma.note.updateMany({ where: { title: "n0" }, data: { updatedAt: new Date() } });

    const res = await call(dashboard, "GET", "/api/dashboard", { token });
    expect(res.status).toBe(200);
    expect(res.body.recentNotes.map((n: { title: string }) => n.title)).toEqual(["n6", "n5", "n4", "n3", "n2"]);
    expect(res.body.recentNotes[0]).toHaveProperty("contentPreview");
  });

  it("F10_AC3_RecentLinks_AllWhenFewerThanFive", async () => {
    const { user, token } = await createUser();
    for (let i = 0; i < 3; i++) {
      await prisma.link.create({ data: { userId: user.id, title: `l${i}`, url: "https://a.dev", createdAt: at(i) } });
    }
    const res = await call(dashboard, "GET", "/api/dashboard", { token });
    expect(res.body.recentLinks.map((l: { title: string }) => l.title)).toEqual(["l2", "l1", "l0"]);
  });

  it("F10_AC4_TopTags_ByItemCountThenNameExcludingEmpty", async () => {
    const { user, token } = await createUser();
    const tag = (name: string) =>
      prisma.tag.create({ data: { userId: user.id, name, normalizedName: name.toUpperCase() } });
    const [sql, react, math] = [await tag("sql"), await tag("react"), await tag("math")];
    await tag("empty");
    const attachNotes = async (tagId: number, n: number) => {
      for (let i = 0; i < n; i++) {
        await prisma.note.create({ data: { userId: user.id, title: "n", noteTags: { create: { tagId } } } });
      }
    };
    await attachNotes(sql.id, 4);
    await attachNotes(react.id, 2);
    for (let i = 0; i < 2; i++) {
      await prisma.link.create({
        data: { userId: user.id, title: "l", url: "https://a.dev", linkTags: { create: { tagId: react.id } } },
      });
    }
    await attachNotes(math.id, 1);

    const res = await call(dashboard, "GET", "/api/dashboard", { token });
    expect(res.body.topTags).toEqual([
      { id: react.id, name: "react", itemCount: 4 },
      { id: sql.id, name: "sql", itemCount: 4 },
      { id: math.id, name: "math", itemCount: 1 },
    ]);
  });

  it("F10_AC5_AC6_Counts_OwnDataOnly", async () => {
    const a = await createUser();
    const b = await createUser();
    await prisma.note.createMany({ data: Array.from({ length: 7 }, () => ({ userId: a.user.id, title: "n" })) });
    await prisma.link.createMany({
      data: Array.from({ length: 3 }, () => ({ userId: a.user.id, title: "l", url: "https://a.dev" })),
    });
    await prisma.tag.createMany({
      data: ["a", "b", "c", "d"].map((n) => ({ userId: a.user.id, name: n, normalizedName: n.toUpperCase() })),
    });
    await prisma.note.create({ data: { userId: b.user.id, title: "B's" } });

    const res = await call(dashboard, "GET", "/api/dashboard", { token: a.token });
    expect(res.body.counts).toEqual({ notes: 7, links: 3, tags: 4 });
    expect(res.body.recentNotes.every((n: { title: string }) => n.title === "n")).toBe(true);
  });

  it("F10_AC10_NoToken_Returns401", async () => {
    expect((await call(dashboard, "GET", "/api/dashboard")).status).toBe(401);
  });
});
