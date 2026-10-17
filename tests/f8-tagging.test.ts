import { describe, expect, it } from "vitest";
import { GET as listNotes, POST as createNote } from "@/app/api/notes/route";
import { DELETE as deleteNote, PUT as updateNote } from "@/app/api/notes/[id]/route";
import { GET as listLinks, POST as createLink } from "@/app/api/links/route";
import { prisma } from "@/lib/db";
import { call, createUser, sleep } from "./helpers/api";

async function makeTag(userId: number, name: string) {
  return prisma.tag.create({ data: { userId, name, normalizedName: name.toUpperCase() } });
}

const idParams = (id: number) => ({ params: { id: String(id) } });

describe("F8 tagging & filter", () => {
  it("F8_AC1_CreateWithTagIds_DedupesAndSortsTags", async () => {
    const { user, token } = await createUser();
    const cse = await makeTag(user.id, "CSE 325");
    const db = await makeTag(user.id, "databases");
    const res = await call(createNote, "POST", "/api/notes", {
      token,
      body: { title: "Joins", content: "", tagIds: [db.id, cse.id, cse.id] },
    });
    expect(res.status).toBe(201);
    expect(res.body.tags).toEqual([
      { id: cse.id, name: "CSE 325" },
      { id: db.id, name: "databases" },
    ]);
  });

  it("F8_AC2_PutWithoutTagIds_KeepsTags", async () => {
    const { user, token } = await createUser();
    const t1 = await makeTag(user.id, "a");
    const t2 = await makeTag(user.id, "b");
    const note = await call(createNote, "POST", "/api/notes", { token, body: { title: "n", tagIds: [t1.id, t2.id] } });
    const res = await call(updateNote, "PUT", "", { token, ...idParams(note.body.id), body: { title: "renamed" } });
    expect(res.body.tags.map((t: { id: number }) => t.id)).toEqual([t1.id, t2.id]);
  });

  it("F8_AC3_PutWithEmptyTagIds_ClearsTagsAndBumpsUpdatedAt", async () => {
    const { user, token } = await createUser();
    const t1 = await makeTag(user.id, "a");
    const note = await call(createNote, "POST", "/api/notes", { token, body: { title: "n", tagIds: [t1.id] } });
    await sleep(15);
    const res = await call(updateNote, "PUT", "", { token, ...idParams(note.body.id), body: { title: "n", tagIds: [] } });
    expect(res.body.tags).toEqual([]);
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(note.body.updatedAt).getTime());
  });

  it("F8_AC4_OtherUsersOrMissingTag_SameError", async () => {
    const a = await createUser();
    const b = await createUser();
    const bTag = await makeTag(b.user.id, "b-only");
    const foreign = await call(createNote, "POST", "/api/notes", { token: a.token, body: { title: "n", tagIds: [bTag.id] } });
    const missing = await call(createNote, "POST", "/api/notes", { token: a.token, body: { title: "n", tagIds: [999999] } });
    expect(foreign.status).toBe(400);
    expect(missing.status).toBe(400);
    expect(foreign.body.errors.tagIds).toEqual(missing.body.errors.tagIds);
  });

  it("F8_AC5_ElevenTags_Returns400", async () => {
    const { user, token } = await createUser();
    const ids = [];
    for (let i = 0; i < 11; i++) ids.push((await makeTag(user.id, `t${i}`)).id);
    const res = await call(createLink, "POST", "/api/links", { token, body: { url: "https://a.dev", tagIds: ids } });
    expect(res.status).toBe(400);
    expect(res.body.errors.tagIds).toBeDefined();
  });

  it("F8_AC6_FilterNotesByTag", async () => {
    const { user, token } = await createUser();
    const t1 = await makeTag(user.id, "one");
    const t2 = await makeTag(user.id, "two");
    await call(createNote, "POST", "/api/notes", { token, body: { title: "N1", tagIds: [t1.id] } });
    await call(createNote, "POST", "/api/notes", { token, body: { title: "N2", tagIds: [t1.id, t2.id] } });
    await call(createNote, "POST", "/api/notes", { token, body: { title: "N3" } });
    const res = await call(listNotes, "GET", `/api/notes?tagId=${t1.id}`, { token });
    expect(res.body.map((n: { title: string }) => n.title).sort()).toEqual(["N1", "N2"]);
  });

  it("F8_AC7_FilterByOtherUsersTag_ReturnsEmpty", async () => {
    const a = await createUser();
    const b = await createUser();
    const bTag = await makeTag(b.user.id, "b-only");
    await call(createLink, "POST", "/api/links", { token: a.token, body: { url: "https://a.dev" } });
    const res = await call(listLinks, "GET", `/api/links?tagId=${bTag.id}`, { token: a.token });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("F8_AC8_DeleteNote_RemovesJoinRowKeepsTag", async () => {
    const { user, token } = await createUser();
    const t1 = await makeTag(user.id, "keep");
    const note = await call(createNote, "POST", "/api/notes", { token, body: { title: "n", tagIds: [t1.id] } });
    await call(deleteNote, "DELETE", "", { token, ...idParams(note.body.id) });
    expect(await prisma.noteTag.count()).toBe(0);
    expect(await prisma.tag.findUnique({ where: { id: t1.id } })).not.toBeNull();
  });
});
