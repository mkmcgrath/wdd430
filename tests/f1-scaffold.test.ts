import { describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/http";
import { normalizeTagName } from "@/lib/validation/schemas";
import { createUser } from "./helpers/api";

describe("F1 scaffold", () => {
  it("F1_AC7_Health_Returns200Ok", async () => {
    const response = health();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("F1_AC3_TagNames_UniquePerUserIgnoringCase", async () => {
    const a = await createUser();
    const b = await createUser();
    await prisma.tag.create({ data: { userId: a.user.id, name: "react", normalizedName: normalizeTagName("react") } });
    await prisma.tag.create({ data: { userId: b.user.id, name: "react", normalizedName: normalizeTagName("react") } });
    await expect(
      prisma.tag.create({ data: { userId: a.user.id, name: "React", normalizedName: normalizeTagName("React") } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("F1_AC4_DeleteUser_CascadesToAllOwnedRows", async () => {
    const { user } = await createUser();
    const tag = await prisma.tag.create({ data: { userId: user.id, name: "t", normalizedName: "T" } });
    await prisma.note.create({ data: { userId: user.id, title: "n", noteTags: { create: [{ tagId: tag.id }] } } });
    await prisma.link.create({
      data: { userId: user.id, title: "l", url: "https://example.com", linkTags: { create: [{ tagId: tag.id }] } },
    });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.note.count()).toBe(0);
    expect(await prisma.link.count()).toBe(0);
    expect(await prisma.tag.count()).toBe(0);
    expect(await prisma.noteTag.count()).toBe(0);
    expect(await prisma.linkTag.count()).toBe(0);
  });

  it("F1_AC5_ThrownError_Returns500ProblemWithoutStack", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrors(async () => {
      throw new Error("database exploded at /secret/path");
    });
    const response = await handler(new Request("http://localhost/api/boom"), {});
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(body).toMatchObject({ status: 500, title: "Internal server error" });
    expect(body.requestId).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain("exploded");
    expect(JSON.stringify(body)).not.toContain("at ");
    spy.mockRestore();
  });
});
