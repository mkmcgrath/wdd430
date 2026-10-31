import { describe, expect, it } from "vitest";
import { one, run } from "../server/db";
import { json, signedIn, tick } from "./helpers";

const newNote = async (api: Awaited<ReturnType<typeof signedIn>>["api"], body: object) =>
  json(await api.post("/notes", { title: "Note", content: "", ...body }));
const newLink = async (api: Awaited<ReturnType<typeof signedIn>>["api"], body: object) =>
  json(await api.post("/links", { url: "https://example.com/", ...body }));
const newTag = async (api: Awaited<ReturnType<typeof signedIn>>["api"], name: string) =>
  json(await api.post("/tags", { name }));

describe("notes", () => {
  it("creates a note with a Location header", async () => {
    const { api } = await signedIn();
    const response = await api.post("/notes", { title: " First ", content: "Body" });
    expect(response.status).toBe(201);
    const note = await json(response);
    expect(note.title).toBe("First");
    expect(response.headers.get("location")).toBe(`/vault/api/notes/${note.id}`);
  });

  it("rejects a blank or long title and oversized content", async () => {
    const { api } = await signedIn();
    for (const title of ["  ", "x".repeat(201)]) {
      const response = await api.post("/notes", { title });
      expect(response.status).toBe(400);
      expect((await json(response)).errors.title).toBeDefined();
    }
    const response = await api.post("/notes", { title: "T", content: "x".repeat(20_001) });
    expect(response.status).toBe(400);
    expect((await json(response)).errors.content).toBeDefined();
  });

  it("lists only your notes, newest update first, with a preview", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    await newNote(other.api, { title: "Not mine" });
    const first = await newNote(api, { title: "First", content: "line one\nline two" });
    await tick();
    const second = await newNote(api, { title: "Second" });

    const list = await json(await api.get("/notes"));
    expect(list.map((note: { id: number }) => note.id)).toEqual([second.id, first.id]);
    expect(list[1].contentPreview).toBe("line one line two");
    expect(list[1]).not.toHaveProperty("content");
  });

  it("returns 404 for another user's note", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    const note = await newNote(other.api, {});
    expect((await api.get(`/notes/${note.id}`)).status).toBe(404);
    expect((await api.put(`/notes/${note.id}`, { title: "Mine now" })).status).toBe(404);
    expect((await api.del(`/notes/${note.id}`)).status).toBe(404);
    expect((await json(await other.api.get(`/notes/${note.id}`))).title).toBe("Note");
  });

  it("bumps updatedAt and keeps createdAt on update", async () => {
    const { api } = await signedIn();
    const note = await newNote(api, {});
    await tick();
    const updated = await json(await api.put(`/notes/${note.id}`, { title: "Edited", content: "New" }));
    expect(updated.title).toBe("Edited");
    expect(updated.createdAt).toBe(note.createdAt);
    expect(updated.updatedAt > note.updatedAt).toBe(true);
  });

  it("ignores client-supplied owner and dates", async () => {
    const { api, userId } = await signedIn();
    const note = await newNote(api, { userId: 999, id: 999, createdAt: "2000-01-01T00:00:00.000Z" });
    expect(note.id).not.toBe(999);
    expect(note.createdAt).not.toContain("2000");
    const row = one<{ user_id: number }>("SELECT user_id FROM notes WHERE id = ?", note.id)!;
    expect(row.user_id).toBe(userId);
  });

  it("deletes a note", async () => {
    const { api } = await signedIn();
    const note = await newNote(api, {});
    expect((await api.del(`/notes/${note.id}`)).status).toBe(204);
    expect((await api.get(`/notes/${note.id}`)).status).toBe(404);
  });

  it("stores script content as literal text", async () => {
    const { api } = await signedIn();
    const content = "<script>alert(1)</script>";
    const note = await newNote(api, { content });
    expect((await json(await api.get(`/notes/${note.id}`))).content).toBe(content);
  });

  it("returns 404 for a non-numeric ID", async () => {
    const { api } = await signedIn();
    expect((await api.get("/notes/abc")).status).toBe(404);
  });
});

describe("links", () => {
  it("creates a link with a Location header", async () => {
    const { api } = await signedIn();
    const response = await api.post("/links", { url: "https://example.com/a", title: "A", description: "Desc" });
    expect(response.status).toBe(201);
    const link = await json(response);
    expect(response.headers.get("location")).toBe(`/vault/api/links/${link.id}`);
  });

  it("defaults the title to the URL", async () => {
    const { api } = await signedIn();
    const link = await newLink(api, { url: "https://example.com/a", title: "  " });
    expect(link.title).toBe("https://example.com/a");
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "/relative", "example.com"])(
    "rejects the unsafe or relative URL %s",
    async (url) => {
      const { api } = await signedIn();
      const response = await api.post("/links", { url });
      expect(response.status).toBe(400);
      expect((await json(response)).errors.url).toBeDefined();
    },
  );

  it("rejects a long URL or description", async () => {
    const { api } = await signedIn();
    expect((await api.post("/links", { url: `https://example.com/${"x".repeat(2048)}` })).status).toBe(400);
    expect((await api.post("/links", { url: "https://example.com", description: "x".repeat(1001) })).status).toBe(400);
  });

  it("lists only your links, newest update first", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    await newLink(other.api, {});
    const first = await newLink(api, {});
    await tick();
    const second = await newLink(api, {});
    const list = await json(await api.get("/links"));
    expect(list.map((link: { id: number }) => link.id)).toEqual([second.id, first.id]);
  });

  it("returns 404 for another user's link", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    const link = await newLink(other.api, {});
    expect((await api.get(`/links/${link.id}`)).status).toBe(404);
    expect((await api.put(`/links/${link.id}`, { url: "https://example.com" })).status).toBe(404);
    expect((await api.del(`/links/${link.id}`)).status).toBe(404);
  });

  it("bumps updatedAt on edit and keeps createdAt", async () => {
    const { api } = await signedIn();
    const link = await newLink(api, {});
    await tick();
    const updated = await json(
      await api.put(`/links/${link.id}`, { url: link.url, title: link.title, description: "Now with text" }),
    );
    expect(updated.description).toBe("Now with text");
    expect(updated.createdAt).toBe(link.createdAt);
    expect(updated.updatedAt > link.updatedAt).toBe(true);
  });

  it("deletes a link and allows duplicate URLs", async () => {
    const { api } = await signedIn();
    const first = await newLink(api, {});
    const second = await newLink(api, {});
    expect(second.url).toBe(first.url);
    expect((await api.del(`/links/${first.id}`)).status).toBe(204);
    expect((await api.get(`/links/${first.id}`)).status).toBe(404);
  });

  it("returns HTML in a description as literal text", async () => {
    const { api } = await signedIn();
    const link = await newLink(api, { description: "<b>bold</b>" });
    expect(link.description).toBe("<b>bold</b>");
  });
});

describe("tags", () => {
  it("creates a tag with a trimmed name", async () => {
    const { api } = await signedIn();
    const response = await api.post("/tags", { name: "  react " });
    expect(response.status).toBe(201);
    expect((await json(response)).name).toBe("react");
  });

  it("is unique per user ignoring case", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    await newTag(api, "React");
    expect((await api.post("/tags", { name: "REACT" })).status).toBe(409);
    expect((await other.api.post("/tags", { name: "React" })).status).toBe(201);
  });

  it.each(["", "x".repeat(51), "a,b"])("rejects the name '%s'", async (name) => {
    const { api } = await signedIn();
    const response = await api.post("/tags", { name });
    expect(response.status).toBe(400);
    expect((await json(response)).errors.name).toBeDefined();
  });

  it("allows a case-only rename and rejects a rename onto another tag", async () => {
    const { api } = await signedIn();
    const tag = await newTag(api, "react");
    await newTag(api, "vue");
    expect((await api.put(`/tags/${tag.id}`, { name: "React" })).status).toBe(200);
    expect((await api.put(`/tags/${tag.id}`, { name: "VUE" })).status).toBe(409);
  });

  it("lists your tags sorted ignoring case", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    await newTag(other.api, "hidden");
    for (const name of ["beta", "Alpha", "gamma"]) await newTag(api, name);
    const list = await json(await api.get("/tags"));
    expect(list.map((tag: { name: string }) => tag.name)).toEqual(["Alpha", "beta", "gamma"]);
  });

  it("counts usage, and deleting a tag keeps its items", async () => {
    const { api } = await signedIn();
    const tag = await newTag(api, "shared");
    const note = await newNote(api, { tagIds: [tag.id] });
    const link = await newLink(api, { tagIds: [tag.id] });

    const [listed] = await json(await api.get("/tags"));
    expect(listed).toMatchObject({ noteCount: 1, linkCount: 1 });

    expect((await api.del(`/tags/${tag.id}`)).status).toBe(204);
    expect((await json(await api.get(`/notes/${note.id}`))).tags).toEqual([]);
    expect((await json(await api.get(`/links/${link.id}`))).tags).toEqual([]);
  });

  it("returns 404 for another user's tag", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    const tag = await newTag(other.api, "theirs");
    expect((await api.put(`/tags/${tag.id}`, { name: "mine" })).status).toBe(404);
    expect((await api.del(`/tags/${tag.id}`)).status).toBe(404);
  });
});

describe("tagging and filters", () => {
  it("dedupes and sorts tags on create", async () => {
    const { api } = await signedIn();
    const b = await newTag(api, "beta");
    const a = await newTag(api, "alpha");
    const note = await newNote(api, { tagIds: [b.id, a.id, b.id] });
    expect(note.tags.map((tag: { name: string }) => tag.name)).toEqual(["alpha", "beta"]);
  });

  it("keeps tags when tagIds is left out and clears them with an empty list", async () => {
    const { api } = await signedIn();
    const tag = await newTag(api, "keep");
    const note = await newNote(api, { tagIds: [tag.id] });

    const kept = await json(await api.put(`/notes/${note.id}`, { title: "T" }));
    expect(kept.tags).toHaveLength(1);

    await tick();
    const cleared = await json(await api.put(`/notes/${note.id}`, { title: "T", tagIds: [] }));
    expect(cleared.tags).toEqual([]);
    expect(cleared.updatedAt > kept.updatedAt).toBe(true);
  });

  it("gives the same error for a missing tag and another user's tag", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    const theirs = await newTag(other.api, "theirs");
    const a = await api.post("/notes", { title: "T", tagIds: [theirs.id] });
    const b = await api.post("/notes", { title: "T", tagIds: [99999999] });
    expect(a.status).toBe(400);
    expect(await json(a)).toEqual(await json(b));
  });

  it("rejects eleven tags", async () => {
    const { api } = await signedIn();
    const response = await api.post("/notes", { title: "T", tagIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
    expect(response.status).toBe(400);
    expect((await json(response)).errors.tagIds).toBeDefined();
  });

  it("filters notes and links by tag", async () => {
    const { api } = await signedIn();
    const tag = await newTag(api, "only");
    const note = await newNote(api, { tagIds: [tag.id] });
    const link = await newLink(api, { tagIds: [tag.id] });
    await newNote(api, {});
    await newLink(api, {});

    const notes = await json(await api.get(`/notes?tagId=${tag.id}`));
    expect(notes.map((item: { id: number }) => item.id)).toEqual([note.id]);
    const links = await json(await api.get(`/links?tagId=${tag.id}`));
    expect(links.map((item: { id: number }) => item.id)).toEqual([link.id]);
  });

  it("returns nothing when filtering by another user's tag", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    const tag = await newTag(other.api, "theirs");
    await newNote(api, {});
    expect(await json(await api.get(`/notes?tagId=${tag.id}`))).toEqual([]);
  });

  it("removes join rows when a note is deleted but keeps the tag", async () => {
    const { api } = await signedIn();
    const tag = await newTag(api, "stays");
    const note = await newNote(api, { tagIds: [tag.id] });
    await api.del(`/notes/${note.id}`);
    const [listed] = await json(await api.get("/tags"));
    expect(listed).toMatchObject({ id: tag.id, noteCount: 0 });
  });
});

describe("search", () => {
  it("matches titles and content ignoring case", async () => {
    const { api } = await signedIn();
    const byTitle = await newNote(api, { title: "SQL basics" });
    const byContent = await newNote(api, { title: "Other", content: "all about sql joins" });
    await newNote(api, { title: "Unrelated" });
    const found = await json(await api.get("/notes?q=sql"));
    expect(found.map((note: { id: number }) => note.id).sort()).toEqual([byTitle.id, byContent.id].sort());
  });

  it("matches a link's URL, description, and title", async () => {
    const { api } = await signedIn();
    await newLink(api, { url: "https://needle.example/" });
    await newLink(api, { description: "a needle here" });
    await newLink(api, { title: "Needle" });
    await newLink(api, { title: "Nothing" });
    expect(await json(await api.get("/links?q=needle"))).toHaveLength(3);
  });

  it("treats wildcard characters literally", async () => {
    const { api } = await signedIn();
    await newNote(api, { title: "100 percent" });
    await newNote(api, { title: "snake_case" });
    await newNote(api, { title: "snakeXcase" });
    const exact = await newNote(api, { title: "100% done" });

    expect((await json(await api.get(`/notes?q=${encodeURIComponent("100%")}`))).map((n: any) => n.id)).toEqual([exact.id]);
    expect(await json(await api.get("/notes?q=snake_case"))).toHaveLength(1);
  });

  it("does not return other users' content", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    await newNote(other.api, { title: "secretword" });
    expect(await json(await api.get("/notes?q=secretword"))).toEqual([]);
  });

  it("rejects long queries and treats a blank one as the full list", async () => {
    const { api } = await signedIn();
    await newNote(api, {});
    expect((await api.get(`/notes?q=${"x".repeat(101)}`)).status).toBe(400);
    expect(await json(await api.get("/notes?q=%20%20"))).toHaveLength(1);
  });

  it("combines search with the tag filter", async () => {
    const { api } = await signedIn();
    const tag = await newTag(api, "filter");
    const match = await newNote(api, { title: "needle", tagIds: [tag.id] });
    await newNote(api, { title: "needle" });
    await newNote(api, { title: "other", tagIds: [tag.id] });
    const found = await json(await api.get(`/notes?q=needle&tagId=${tag.id}`));
    expect(found.map((note: { id: number }) => note.id)).toEqual([match.id]);
  });
});

describe("dashboard", () => {
  it("shows the five newest notes and all links when fewer than five", async () => {
    const { api } = await signedIn();
    const ids = [];
    for (let i = 0; i < 6; i += 1) ids.push((await newNote(api, { title: `N${i}` })).id);
    await newLink(api, {});
    const { recentNotes, recentLinks } = await json(await api.get("/dashboard"));
    expect(recentNotes.map((note: { id: number }) => note.id)).toEqual(ids.slice(1).reverse());
    expect(recentLinks).toHaveLength(1);
  });

  it("ranks top tags by item count then name and skips unused tags", async () => {
    const { api } = await signedIn();
    const busy = await newTag(api, "busy");
    const alpha = await newTag(api, "alpha");
    const zulu = await newTag(api, "zulu");
    await newTag(api, "unused");
    await newNote(api, { tagIds: [busy.id, zulu.id] });
    await newLink(api, { tagIds: [busy.id, alpha.id] });
    const { topTags } = await json(await api.get("/dashboard"));
    expect(topTags.map((tag: { name: string }) => tag.name)).toEqual(["busy", "alpha", "zulu"]);
    expect(topTags[0].itemCount).toBe(2);
  });

  it("counts only your data", async () => {
    const { api } = await signedIn();
    const other = await signedIn();
    await newNote(other.api, {});
    await newNote(api, {});
    await newTag(api, "one");
    const { counts } = await json(await api.get("/dashboard"));
    expect(counts).toEqual({ notes: 1, links: 0, tags: 1 });
  });
});

describe("database", () => {
  it("cascades a user delete to everything they own", async () => {
    const { api, userId } = await signedIn();
    const tag = await newTag(api, "gone");
    await newNote(api, { tagIds: [tag.id] });
    await newLink(api, { tagIds: [tag.id] });
    run("DELETE FROM users WHERE id = ?", userId);
    for (const table of ["notes", "links", "tags", "sessions"]) {
      const { count } = one<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`, userId)!;
      expect(count).toBe(0);
    }
  });
});
