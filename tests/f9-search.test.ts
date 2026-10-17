import { describe, expect, it } from "vitest";
import { GET as listNotes } from "@/app/api/notes/route";
import { GET as listLinks } from "@/app/api/links/route";
import { prisma } from "@/lib/db";
import { call, createUser } from "./helpers/api";

const titles = (body: { title: string }[]) => body.map((item) => item.title).sort();

describe("F9 search", () => {
  it("F9_AC1_TitleMatch_CaseInsensitive", async () => {
    const { user, token } = await createUser();
    await prisma.note.createMany({
      data: [
        { userId: user.id, title: "Docker compose cheatsheet" },
        { userId: user.id, title: "Grocery list" },
      ],
    });
    const res = await call(listNotes, "GET", "/api/notes?q=DOCKER", { token });
    expect(titles(res.body)).toEqual(["Docker compose cheatsheet"]);
  });

  it("F9_AC2_ContentMatch", async () => {
    const { user, token } = await createUser();
    await prisma.note.create({ data: { userId: user.id, title: "SQL", content: "use an inner join here" } });
    const res = await call(listNotes, "GET", `/api/notes?q=${encodeURIComponent("Inner Join")}`, { token });
    expect(titles(res.body)).toEqual(["SQL"]);
  });

  it("F9_AC3_LinkMatchesUrlDescriptionTitle", async () => {
    const { user, token } = await createUser();
    await prisma.link.createMany({
      data: [
        { userId: user.id, title: "repo", url: "https://github.com/expressjs/express" },
        { userId: user.id, title: "orm", url: "https://a.dev", description: "Prisma tutorial" },
        { userId: user.id, title: "Kubernetes basics", url: "https://b.dev" },
      ],
    });
    for (const [q, expected] of [
      ["github.com/expressjs", "repo"],
      ["prisma tutorial", "orm"],
      ["kubernetes", "Kubernetes basics"],
    ]) {
      const res = await call(listLinks, "GET", `/api/links?q=${encodeURIComponent(q)}`, { token });
      expect(titles(res.body), q).toEqual([expected]);
    }
  });

  it("F9_AC4_WildcardCharacters_MatchLiterally", async () => {
    const { user, token } = await createUser();
    await prisma.note.createMany({
      data: [
        { userId: user.id, title: "100% done" },
        { userId: user.id, title: "100 percent" },
        { userId: user.id, title: "my_var" },
        { userId: user.id, title: "myXvar" },
      ],
    });
    const pct = await call(listNotes, "GET", `/api/notes?q=${encodeURIComponent("100%")}`, { token });
    expect(titles(pct.body)).toEqual(["100% done"]);
    const underscore = await call(listNotes, "GET", "/api/notes?q=my_var", { token });
    expect(titles(underscore.body)).toEqual(["my_var"]);
  });

  it("F9_AC5_OtherUsersContent_NotReturned", async () => {
    const a = await createUser();
    const b = await createUser();
    await prisma.note.create({ data: { userId: b.user.id, title: "secret plans" } });
    const res = await call(listNotes, "GET", "/api/notes?q=secret", { token: a.token });
    expect(res.body).toEqual([]);
  });

  it("F9_AC6_TooLongQueryIs400_BlankQueryIsFullList", async () => {
    const { user, token } = await createUser();
    await prisma.note.createMany({ data: [{ userId: user.id, title: "a" }, { userId: user.id, title: "b" }] });
    const long = await call(listNotes, "GET", `/api/notes?q=${"x".repeat(101)}`, { token });
    expect(long.status).toBe(400);
    expect(long.body.errors.q).toBeDefined();
    const blank = await call(listNotes, "GET", "/api/notes?q=%20%20", { token });
    expect(blank.body).toHaveLength(2);
  });

  it("F9_AC7_SearchCombinesWithTagFilter", async () => {
    const { user, token } = await createUser();
    const tag = await prisma.tag.create({ data: { userId: user.id, name: "databases", normalizedName: "DATABASES" } });
    await prisma.note.create({
      data: { userId: user.id, title: "N1", content: "join", noteTags: { create: { tagId: tag.id } } },
    });
    await prisma.note.create({ data: { userId: user.id, title: "N2", content: "join" } });
    const res = await call(listNotes, "GET", `/api/notes?q=join&tagId=${tag.id}`, { token });
    expect(titles(res.body)).toEqual(["N1"]);
  });
});
