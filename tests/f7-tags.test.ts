import { describe, expect, it } from "vitest";
import { GET as list, POST as create } from "@/app/api/tags/route";
import { DELETE as remove, PUT as rename } from "@/app/api/tags/[id]/route";
import { prisma } from "@/lib/db";
import { call, createUser } from "./helpers/api";

const idParams = (id: number) => ({ params: { id: String(id) } });

describe("F7 tag management", () => {
  it("F7_AC1_CreateTag_TrimsName", async () => {
    const { token } = await createUser();
    const res = await call(create, "POST", "/api/tags", { token, body: { name: "  CSE 325 " } });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), name: "CSE 325" });
  });

  it("F7_AC2_SameNameDifferentCase_Returns409", async () => {
    const { token } = await createUser();
    await call(create, "POST", "/api/tags", { token, body: { name: "React" } });
    const res = await call(create, "POST", "/api/tags", { token, body: { name: "react" } });
    expect(res.status).toBe(409);
    expect(res.body.errors.name).toEqual(["A tag with this name already exists."]);
  });

  it("F7_AC3_SameNameOtherUser_Returns201", async () => {
    const a = await createUser();
    const b = await createUser();
    await call(create, "POST", "/api/tags", { token: b.token, body: { name: "React" } });
    const res = await call(create, "POST", "/api/tags", { token: a.token, body: { name: "React" } });
    expect(res.status).toBe(201);
  });

  it("F7_AC4_EmptyLongOrCommaName_Returns400UnderName", async () => {
    const { token } = await createUser();
    for (const name of ["", "x".repeat(51), "a,b"]) {
      const res = await call(create, "POST", "/api/tags", { token, body: { name } });
      expect(res.status, name).toBe(400);
      expect(res.body.errors.name).toBeDefined();
    }
  });

  it("F7_AC5_RenameCaseOnly_Succeeds_RenameToExisting_409", async () => {
    const { token } = await createUser();
    const react = await call(create, "POST", "/api/tags", { token, body: { name: "react" } });
    const vue = await call(create, "POST", "/api/tags", { token, body: { name: "Vue" } });

    const ok = await call(rename, "PUT", "", { token, ...idParams(react.body.id), body: { name: "React" } });
    expect(ok.status).toBe(200);
    expect(ok.body.name).toBe("React");

    const conflict = await call(rename, "PUT", "", { token, ...idParams(vue.body.id), body: { name: "REACT" } });
    expect(conflict.status).toBe(409);
  });

  it("F7_AC6_List_SortedIgnoringCaseAndOwnOnly", async () => {
    const a = await createUser();
    const b = await createUser();
    for (const name of ["zeta", "Alpha", "beta"]) {
      await call(create, "POST", "/api/tags", { token: a.token, body: { name } });
    }
    await call(create, "POST", "/api/tags", { token: b.token, body: { name: "other" } });
    const res = await call(list, "GET", "/api/tags", { token: a.token });
    expect(res.body.map((t: { name: string }) => t.name)).toEqual(["Alpha", "beta", "zeta"]);
  });

  it("F7_AC7_AC8_CountsThenDeleteKeepsItems", async () => {
    const { user, token } = await createUser();
    const tag = await prisma.tag.create({ data: { userId: user.id, name: "t", normalizedName: "T" } });
    const n1 = await prisma.note.create({ data: { userId: user.id, title: "n1", noteTags: { create: { tagId: tag.id } } } });
    const n2 = await prisma.note.create({ data: { userId: user.id, title: "n2", noteTags: { create: { tagId: tag.id } } } });
    const l1 = await prisma.link.create({
      data: { userId: user.id, title: "l1", url: "https://a.dev", linkTags: { create: { tagId: tag.id } } },
    });

    const listed = await call(list, "GET", "/api/tags", { token });
    expect(listed.body[0]).toMatchObject({ noteCount: 2, linkCount: 1 });

    expect((await call(remove, "DELETE", "", { token, ...idParams(tag.id) })).status).toBe(204);
    expect(await prisma.noteTag.count()).toBe(0);
    expect(await prisma.linkTag.count()).toBe(0);
    expect(await prisma.note.count({ where: { id: { in: [n1.id, n2.id] } } })).toBe(2);
    expect(await prisma.link.findUnique({ where: { id: l1.id } })).not.toBeNull();
  });

  it("F7_AC9_OtherUsersTag_PutDeleteReturn404", async () => {
    const a = await createUser();
    const b = await createUser();
    const tag = await call(create, "POST", "/api/tags", { token: b.token, body: { name: "Mine" } });
    const opts = { token: a.token, ...idParams(tag.body.id) };
    expect((await call(rename, "PUT", "", { ...opts, body: { name: "Stolen" } })).status).toBe(404);
    expect((await call(remove, "DELETE", "", opts)).status).toBe(404);
    expect(await prisma.tag.findUnique({ where: { id: tag.body.id } })).toMatchObject({ name: "Mine" });
  });
});
